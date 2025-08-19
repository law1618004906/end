'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, FileDown, Home, ShieldAlert, Users, Search, RefreshCw, FileSpreadsheet } from 'lucide-react'

interface Leader {
  id: number
  full_name: string
  residence?: string | null
  phone?: string | null
  workplace?: string | null
  center_info?: string | null
  station_number?: string | null
  votes_count: number
  _count?: { individuals: number }
  totalIndividualsVotes?: number
}

interface Individual {
  id: number
  full_name: string
  leader_name?: string | null
  residence?: string | null
  phone?: string | null
  workplace?: string | null
  center_info?: string | null
  station_number?: string | null
  votes_count: number
}

export default function ReportsPage() {
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()
  const { has, loading: permsLoading } = usePermissions()

  const [leaders, setLeaders] = React.useState<Leader[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [q, setQ] = React.useState('')
  const [isFetching, setIsFetching] = React.useState(false)

  // members cache per leader name
  const [members, setMembers] = React.useState<Record<string, Individual[]>>({})
  const [printLeaderId, setPrintLeaderId] = React.useState<number | null>(null)

  // Columns config for Excel export
  const allColumns = React.useMemo(
    () => [
      { key: 'full_name' as const, label: 'الاسم' },
      { key: 'phone' as const, label: 'الهاتف' },
      { key: 'residence' as const, label: 'السكن' },
      { key: 'workplace' as const, label: 'العمل' },
      { key: 'center_info' as const, label: 'المركز' },
      { key: 'station_number' as const, label: 'المحطة' },
      { key: 'votes_count' as const, label: 'الأصوات' },
    ],
    []
  )
  const [selectedCols, setSelectedCols] = React.useState<string[]>(
    allColumns.map((c) => c.key)
  )
  const toggleCol = (k: string) => {
    setSelectedCols((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    )
  }

  async function exportAllExcel() {
    setIsFetching(true)
    try {
      const Excel = await import('exceljs')
      const workbook = new Excel.Workbook()

      for (const l of filtered) {
        const leaderName = (l.full_name || '').trim()
        const ws = workbook.addWorksheet(sanitizeSheetName(leaderName || 'القائد'))
        const people = await loadLeaderMembers(leaderName)

        // Header with totals, including totalIndividualsVotes
        ws.addRow([`تقرير القائد: ${leaderName}`])
        ws.addRow([
          `الهاتف: ${l.phone || '-'}`,
          `السكن: ${l.residence || '-'}`,
          `العمل: ${l.workplace || '-'}`,
        ])
        const sumVotes =
          typeof (l as any).totalIndividualsVotes === 'number'
            ? (l as any).totalIndividualsVotes
            : people.reduce((s, p) => s + (p.votes_count || 0), 0)
        ws.addRow([
          `المركز: ${l.center_info || '-'}`,
          `المحطة: ${l.station_number || '-'}`,
          `عدد الأفراد: ${l._count?.individuals ?? people.length}`,
          `مجموع أصوات الأفراد: ${sumVotes}`,
        ])
        ws.addRow([])

        const header = ['#', ...allColumns.filter(c => selectedCols.includes(c.key)).map(c => c.label)]
        const headerRow = ws.addRow(header)
        headerRow.font = { bold: true }

        people.forEach((p, idx) => {
          const row: any[] = [idx + 1]
          allColumns.forEach((c) => {
            if (!selectedCols.includes(c.key)) return
            switch (c.key) {
              case 'full_name':
                row.push(p.full_name)
                break
              case 'phone':
                row.push(p.phone || '-')
                break
              case 'residence':
                row.push(p.residence || '-')
                break
              case 'workplace':
                row.push(p.workplace || '-')
                break
              case 'center_info':
                row.push(p.center_info || '-')
                break
              case 'station_number':
                row.push(p.station_number || '-')
                break
              case 'votes_count':
                row.push(p.votes_count ?? 0)
                break
            }
          })
          ws.addRow(row)
        })

        // Autosize columns
        ;(ws.columns ?? []).forEach((col) => {
          if (!col) return
          let max = 10
          ;(col as any)?.eachCell?.({ includeEmpty: true }, (cell: any) => {
            const val = cell?.value?.toString?.() ?? String(cell?.value ?? '')
            max = Math.max(max, val.length + 2)
          })
          ;(col as any).width = Math.min(max, 50)
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `leaders_all_${date}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Excel ALL export failed', e)
    } finally {
      setIsFetching(false)
    }
  }

  React.useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login')
  }, [loading, isAuthenticated, router])

  const allowed = has('reports.read') || has('individuals.read') || has('leaders.read')

  const fetchLeaders = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leaders', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const json = await res.json()
      const data: Leader[] = json?.data ?? json ?? []
      setLeaders(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message || 'فشل في جلب القادة')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLeaders()
  }, [fetchLeaders])

  const filtered = React.useMemo(() => {
    const query = q.trim()
    if (!query) return leaders
    return leaders.filter(l => (l.full_name || '').includes(query))
  }, [leaders, q])

  async function loadLeaderMembers(leaderName: string) {
    if (members[leaderName]) return members[leaderName]
    const acc: Individual[] = []
    let cursor: string | undefined = undefined
    let guard = 0
    while (guard < 50) {
      const sp = new URLSearchParams()
      sp.set('leader_name', leaderName)
      sp.set('pageSize', '200')
      sp.set('sortBy', 'id')
      sp.set('sortDir', 'desc')
      if (cursor) sp.set('cursor', cursor)
      const url = `/api/individuals?${sp.toString()}`
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const pageData: Individual[] = json?.data ?? []
      acc.push(...pageData)
      const hasNext = json?.page?.hasNext
      const nextCursor = json?.page?.nextCursor
      if (!hasNext || !nextCursor) break
      cursor = String(nextCursor)
      guard++
    }
    setMembers(prev => ({ ...prev, [leaderName]: acc }))
    return acc
  }

  async function printLeader(l: Leader) {
    setIsFetching(true)
    try {
      await loadLeaderMembers((l.full_name || '').trim())
      setPrintLeaderId(l.id)
      // give the browser a tick to render
      setTimeout(() => {
        window.print()
        // reset after print
        setTimeout(() => setPrintLeaderId(null), 300)
      }, 150)
    } finally {
      setIsFetching(false)
    }
  }

  async function exportPdf(l: Leader) {
    // Using browser print-to-PDF mechanism for now (no extra deps)
    await printLeader(l)
  }

  function sanitizeSheetName(name: string) {
    const trimmed = (name || 'Sheet').trim()
    // Remove invalid chars: \\/:*?[]
    const cleaned = trimmed.replace(/[\\\/:*?\[\]]/g, ' ')
    // Excel sheet name max length 31
    return cleaned.slice(0, 31) || 'Sheet'
  }

  async function exportExcel(l: Leader) {
    setIsFetching(true)
    try {
      const leaderName = (l.full_name || '').trim()
      const people = await loadLeaderMembers(leaderName)

      const Excel = await import('exceljs')
      const workbook = new Excel.Workbook()
      const ws = workbook.addWorksheet(sanitizeSheetName(leaderName || 'القائد'))

      // Leader header info
      ws.addRow([`تقرير القائد: ${leaderName}`])
      ws.addRow([
        `الهاتف: ${l.phone || '-'}`,
        `السكن: ${l.residence || '-'}`,
        `العمل: ${l.workplace || '-'}`,
      ])
      ws.addRow([
        `المركز: ${l.center_info || '-'}`,
        `المحطة: ${l.station_number || '-'}`,
        `عدد الأفراد: ${l._count?.individuals ?? people.length}`,
      ])
      ws.addRow([])

      // Table header according to selected columns
      const header = ['#', ...allColumns.filter(c => selectedCols.includes(c.key)).map(c => c.label)]
      const headerRow = ws.addRow(header)
      headerRow.font = { bold: true }

      // Rows
      people.forEach((p, idx) => {
        const row: any[] = [idx + 1]
        allColumns.forEach((c) => {
          if (!selectedCols.includes(c.key)) return
          switch (c.key) {
            case 'full_name':
              row.push(p.full_name)
              break
            case 'phone':
              row.push(p.phone || '-')
              break
            case 'residence':
              row.push(p.residence || '-')
              break
            case 'workplace':
              row.push(p.workplace || '-')
              break
            case 'center_info':
              row.push(p.center_info || '-')
              break
            case 'station_number':
              row.push(p.station_number || '-')
              break
            case 'votes_count':
              row.push(p.votes_count ?? 0)
              break
          }
        })
        ws.addRow(row)
      })

      // Autosize columns
      ;(ws.columns ?? []).forEach((col) => {
        if (!col) return
        let max = 10
        ;(col as any)?.eachCell?.({ includeEmpty: true }, (cell: any) => {
          const val = cell?.value?.toString?.() ?? String(cell?.value ?? '')
          max = Math.max(max, val.length + 2)
        })
        ;(col as any).width = Math.min(max, 50)
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `leader_${leaderName || 'report'}_${date}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Excel export failed', e)
    } finally {
      setIsFetching(false)
    }
  }

  if (loading || permsLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" /> غير مصرح لك
            </CardTitle>
            <CardDescription>لا تملك صلاحية عرض هذه الصفحة (reports.read).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>العودة للرئيسية <Home className="h-4 w-4 mr-2" /></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; inset: 0; margin: 0; padding: 0; }
          .page-break { page-break-after: always; }
        }
      `}</style>

      <Card className="bg-card/60 border-border" data-print-hide>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> التقارير
          </CardTitle>
          <CardDescription>
            طباعة وتصدير تقارير القادة وأفرادهم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="q">بحث عن قائد</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="q" className="pl-9" placeholder="اكتب اسم القائد..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" onClick={() => fetchLeaders()} disabled={isFetching}>
              <RefreshCw className={`${isFetching ? 'animate-spin' : ''} h-4 w-4 mr-2`} /> تحديث
            </Button>
            <Button onClick={exportAllExcel} disabled={isFetching}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> تصدير Excel للجميع
            </Button>
          </div>
          <div className="pt-3 border-t mt-4">
            <Label className="block mb-2">أعمدة التصدير</Label>
            <div className="flex flex-wrap gap-3">
              {allColumns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCols.includes(c.key)}
                    onChange={() => toggleCol(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200" data-print-hide>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-print-hide>
        {filtered.map((l) => (
          <Card key={l.id} className="bg-card/60 border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{(l.full_name || '').trim()}</span>
                <div className="flex gap-2" data-print-hide>
                  <Button size="sm" variant="outline" onClick={() => printLeader(l)} disabled={isFetching}>
                    <Printer className="h-4 w-4 mr-1" /> طباعة
                  </Button>
                  <Button size="sm" onClick={() => exportPdf(l)} disabled={isFetching}>
                    <FileDown className="h-4 w-4 mr-1" /> تصدير PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportExcel(l)} disabled={isFetching}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> تصدير Excel
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                إجمالي الأفراد: {(l._count?.individuals ?? 0).toLocaleString('ar-EG')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-1">
                {l.phone && <p>الهاتف: {l.phone}</p>}
                {l.residence && <p>السكن: {l.residence}</p>}
                {l.workplace && <p>العمل: {l.workplace}</p>}
                {l.center_info && <p>المركز: {l.center_info}</p>}
                {l.station_number && <p>المحطة: {l.station_number}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Printable sections, one per leader. Visible only during print */}
      {filtered.map((l) => {
        const leaderName = (l.full_name || '').trim()
        const people = members[leaderName] || []
        const show = printLeaderId === l.id
        return (
          <div key={`print-${l.id}`} className={show ? 'print-section' : 'hidden'}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-2">تقرير القائد: {leaderName}</h1>
              <div className="mb-4 text-sm">
                {l.phone && <div>الهاتف: {l.phone}</div>}
                {l.residence && <div>السكن: {l.residence}</div>}
                {l.workplace && <div>العمل: {l.workplace}</div>}
                {l.center_info && <div>المركز: {l.center_info}</div>}
                {l.station_number && <div>المحطة: {l.station_number}</div>}
                <div>عدد الأفراد: {(l._count?.individuals ?? people.length).toLocaleString('ar-EG')}</div>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">الاسم</th>
                    <th className="border p-2">الهاتف</th>
                    <th className="border p-2">السكن</th>
                    <th className="border p-2">العمل</th>
                    <th className="border p-2">المركز</th>
                    <th className="border p-2">المحطة</th>
                    <th className="border p-2">الأصوات</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="border p-2">{idx + 1}</td>
                      <td className="border p-2">{p.full_name}</td>
                      <td className="border p-2">{p.phone || '-'}</td>
                      <td className="border p-2">{p.residence || '-'}</td>
                      <td className="border p-2">{p.workplace || '-'}</td>
                      <td className="border p-2">{p.center_info || '-'}</td>
                      <td className="border p-2">{p.station_number || '-'}</td>
                      <td className="border p-2">{(p.votes_count ?? 0).toLocaleString('ar-EG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="page-break" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
