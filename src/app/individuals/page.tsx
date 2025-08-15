'use client'

import React from "react"
import { useRouter } from "next/navigation"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Home, Search, Eye, EyeOff, Download, ChevronDown, ShieldAlert, Users, RefreshCw } from "lucide-react"

// أنواع البيانات
interface LeaderOption {
  id: string;
  full_name: string;
}

interface Individual {
  id: number;
  full_name: string;
  address?: string;
  votes_count: number;
  leader_name?: string;
  station_number?: number;
  created_at: string;
  updated_at: string;
}

interface IndividualsPageResp {
  data: Individual[];
  total: number;
  nextCursor?: string | null;
  hasNext?: boolean;
}

// دالة جلب الصفحات
async function fetchPage({
  pageParam,
  q,
  leaderName,
  stationNumber,
  pageSize,
  sortBy,
  sortDir,
}: {
  pageParam?: string;
  q: string;
  leaderName: string;
  stationNumber: string;
  pageSize: number;
  sortBy: 'id' | 'votes_count';
  sortDir: 'asc' | 'desc';
}): Promise<IndividualsPageResp> {
  const sp = new URLSearchParams();

  if (q.trim()) sp.set('q', q);
  if (leaderName.trim()) sp.set('leader_name', leaderName);
  if (stationNumber.trim()) sp.set('station_number', stationNumber);
  if (pageParam) sp.set('cursor', pageParam);
  sp.set('pageSize', pageSize.toString());
  sp.set('sortBy', sortBy);
  sp.set('sortDir', sortDir);

  const url = `/api/individuals?${sp.toString()}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('غير مصرح. يرجى تسجيل الدخول مرة أخرى.');
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'خطأ غير معروف');
      throw new Error(`فشل في جلب البيانات: ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    
    // التعامل مع تنسيق API الحالي: { success: true, data: [...], page: {...} }
    if (json.success && json.data && json.page) {
      return {
        data: json.data,
        total: json.total || json.data.length,
        nextCursor: json.page.nextCursor,
        hasNext: json.page.hasNext
      } as IndividualsPageResp;
    }
    
    // للتوافق مع التنسيقات الأخرى
    return json as IndividualsPageResp;
  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
    throw error;
  }
}

// مكون التحميل المتحرك
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-gradient-to-r rounded-lg"
          style={{
            background:
              'linear-gradient(90deg, rgba(240,240,240,0.6) 25%, rgba(230,230,230,0.6) 37%, rgba(240,240,240,0.6) 63%)',
            backgroundSize: '400% 100%',
            animation: 'shimmer 1.4s ease infinite'
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </div>
  );
}

type RowItemData = { rows: any[][]; q: string; columns: number };

async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export default function IndividualsPage() {
  // جميع الـ hooks في بداية المكون
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const { has, loading: permsLoading } = usePermissions();
  
  // حالات البحث والفلترة
  const [q, setQ] = React.useState<string>("");
  const [leaderName, setLeaderName] = React.useState<string>("");
  const [stationNumber, setStationNumber] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState<number>(50);
  const [sortBy, setSortBy] = React.useState<"id" | "votes_count">("id");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [showDebug, setShowDebug] = React.useState(false);
  const [leadersQ, setLeadersQ] = React.useState<string>("");

  // جلب القادة hooks
  type LeadersResp = { data: LeaderOption[]; nextCursor?: string | null; hasNext?: boolean };
  const leadersQueryKey = React.useMemo(
    () => ['leaders', { q: leadersQ }],
    [leadersQ]
  );

  const fetchLeaders = React.useCallback(async ({ pageParam }: { pageParam?: string }) => {
    const sp = new URLSearchParams();
    if (leadersQ) sp.set('q', leadersQ);
    if (pageParam) sp.set('cursor', pageParam);
    const url = `/api/leaders?${sp.toString()}`;
    
    try {
      const res = await fetch(url, { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('غير مصرح. يرجى تسجيل الدخول مرة أخرى.');
      }
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'خطأ غير معروف');
        throw new Error(`فشل في جلب القادة: ${res.status} - ${errorText}`);
      }
      
      const json = await res.json();
      
      // التعامل مع تنسيق API الحالي: { success: true, data: [...] }
      if (json.success && Array.isArray(json.data)) {
        return { data: json.data as LeaderOption[], nextCursor: null, hasNext: false } as LeadersResp;
      }
      
      // للتوافق مع التنسيقات الأخرى
      if (Array.isArray(json)) {
        return { data: json as LeaderOption[], nextCursor: null, hasNext: false } as LeadersResp;
      }
      
      return json as LeadersResp;
    } catch (error) {
      console.error('خطأ في جلب القادة:', error);
      throw error;
    }
  }, [leadersQ]);

  const {
    data: leadersPages,
    isLoading: isLoadingLeaders,
    isFetching: isFetchingLeaders,
    isFetchingNextPage: isFetchingNextLeaders,
    hasNextPage: leadersHasNext,
    fetchNextPage: leadersFetchNext,
    refetch: refetchLeaders,
  } = useInfiniteQuery<LeadersResp, Error>({
    queryKey: leadersQueryKey,
    queryFn: ({ pageParam }) => fetchLeaders({ pageParam: typeof pageParam === 'string' ? pageParam : undefined }),
    getNextPageParam: (last) => (last?.nextCursor ? last.nextCursor : undefined),
    initialPageParam: undefined,
  });

  const leadersFlat: LeaderOption[] = React.useMemo(
    () => {
      const flattened = (leadersPages?.pages ?? []).flatMap((p) => p.data ?? []);
      return [{ id: "", full_name: "كل القادة" }, ...flattened];
    },
    [leadersPages]
  );

  // جلب الأفراد hooks
  const queryKey = React.useMemo(
    () => ['individuals', { q, leaderName, stationNumber, pageSize, sortBy, sortDir }],
    [q, leaderName, stationNumber, pageSize, sortBy, sortDir]
  );

  const queryFnTyped = React.useCallback(
    ({ pageParam }: { pageParam?: unknown }) =>
      fetchPage({
        pageParam: typeof pageParam === 'string' ? pageParam : undefined,
        q: q ?? '',
        leaderName: leaderName ?? '',
        stationNumber: stationNumber ?? '',
        pageSize: Number(pageSize) || 50,
        sortBy: (sortBy === 'id' || sortBy === 'votes_count' ? sortBy : 'id') as
          | 'id'
          | 'votes_count',
        sortDir: (sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'desc') as 'asc' | 'desc',
      }),
    [q, leaderName, stationNumber, pageSize, sortBy, sortDir]
  );

  const {
    data: pagesData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<IndividualsPageResp, Error>({
    queryKey,
    queryFn: queryFnTyped,
    getNextPageParam: (lastPage) => (lastPage?.nextCursor != null ? lastPage.nextCursor : undefined),
    initialPageParam: undefined,
  });

  // جميع useEffect hooks
  React.useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  // إعداد القيم من URL (مرة واحدة فقط)
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const urlQ = sp.get('q') ?? '';
      const urlLeader = sp.get('leader_name') ?? '';
      const urlStation = sp.get('station_number') ?? '';
      const urlPageSizeRaw = sp.get('pageSize');
      const urlSortByRaw = sp.get('sortBy');
      const urlSortDirRaw = sp.get('sortDir');

      const urlPageSize = urlPageSizeRaw ? Number(urlPageSizeRaw) : NaN;
      const urlSortBy = urlSortByRaw === 'id' || urlSortByRaw === 'votes_count' ? urlSortByRaw : 'id';
      const urlSortDir = urlSortDirRaw === 'asc' || urlSortDirRaw === 'desc' ? urlSortDirRaw : 'desc';

      if (urlQ !== q) setQ(urlQ);
      if (urlLeader !== leaderName) setLeaderName(urlLeader);
      if (urlStation !== stationNumber) setStationNumber(urlStation);
      if (!Number.isNaN(urlPageSize) && urlPageSize !== pageSize) setPageSize(urlPageSize);
      if (urlSortBy !== sortBy) setSortBy(urlSortBy);
      if (urlSortDir !== sortDir) setSortDir(urlSortDir);
    } catch (err) {
      console.warn('خطأ في تحليل URL params:', err);
    }
  }, []);

  // حساب القيم المشتقة
  const isBusy = isFetching || isLoading || isFetchingNextPage;
  
  const handleLeaderHover = React.useCallback((name: string) => {
    if (isBusy) return;
    if (name !== leaderName) {
      setLeaderName(name);
    }
  }, [isBusy, leaderName]);

  const handleLeaderSelect = React.useCallback((name: string) => {
    setLeaderName(name);
  }, []);

  // شروط الإرجاع المبكر بعد جميع الـ hooks
  if (loading || permsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const allowed = has('individuals.read');
  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" /> غير مصرح لك
            </CardTitle>
            <CardDescription>لا تملك صلاحية عرض هذه الصفحة (individuals.read).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>العودة للرئيسية <Home className="h-4 w-4 mr-2" /></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // حساب البيانات المعروضة
  const allRows = pagesData?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = pagesData?.pages[0]?.total ?? 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-card/60 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة الأفراد
            {totalCount > 0 && (
              <Badge variant="secondary" className="mr-2">
                {totalCount.toLocaleString('ar-EG')} فرد
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            البحث والتصفية في قائمة الأفراد المسجلين
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* شريط البحث والفلاتر */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">البحث في الأسماء</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="اكتب اسم الشخص..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-10"
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader-select">اختيار القائد</Label>
              <Select value={leaderName} onValueChange={setLeaderName} disabled={isBusy}>
                <SelectTrigger id="leader-select">
                  <SelectValue placeholder="كل القادة" />
                </SelectTrigger>
                <SelectContent>
                  {leadersFlat.map((leader) => (
                    <SelectItem key={leader.id} value={leader.full_name}>
                      {leader.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="station">رقم المحطة</Label>
              <Input
                id="station"
                placeholder="رقم المحطة..."
                value={stationNumber}
                onChange={(e) => setStationNumber(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-size-select">عدد النتائج</Label>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))} disabled={isBusy}>
                <SelectTrigger id="page-size-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ترتيب النتائج */}
          <div className="flex gap-4 items-center">
            <div className="space-y-2">
              <Label htmlFor="sort-by-select">ترتيب حسب</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "id" | "votes_count")} disabled={isBusy}>
                <SelectTrigger id="sort-by-select" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">الرقم التسلسلي</SelectItem>
                  <SelectItem value="votes_count">عدد الأصوات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort-dir-select">الاتجاه</Label>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")} disabled={isBusy}>
                <SelectTrigger id="sort-dir-select" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">تنازلي</SelectItem>
                  <SelectItem value="asc">تصاعدي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isBusy}
              className="mt-6"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isBusy ? 'animate-spin' : ''}`} />
              تحديث
            </Button>

            <Button
              variant="ghost"
              onClick={() => setShowDebug(!showDebug)}
              className="mt-6"
            >
              {showDebug ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showDebug ? 'إخفاء' : 'عرض'} التفاصيل
            </Button>
          </div>

          {/* معلومات التحديث */}
          {showDebug && (
            <Card className="bg-muted/20 border-muted">
              <CardContent className="pt-4">
                <div className="text-sm space-y-1">
                  <p>الحالة: {isBusy ? 'جاري التحميل...' : 'جاهز'}</p>
                  <p>عدد الصفحات المحملة: {pagesData?.pages.length ?? 0}</p>
                  <p>إجمالي النتائج: {totalCount.toLocaleString('ar-EG')}</p>
                  <p>النتائج المعروضة: {allRows.length.toLocaleString('ar-EG')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* عرض النتائج */}
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : allRows.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground">
                جرب تعديل معايير البحث أو إزالة بعض الفلاتر
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allRows.map((individual) => (
                <div key={individual.id} className="p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium">{individual.full_name}</h3>
                      {individual.address && (
                        <p className="text-sm text-muted-foreground">{individual.address}</p>
                      )}
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {individual.leader_name && (
                          <span>القائد: {individual.leader_name}</span>
                        )}
                        {individual.station_number && (
                          <span>المحطة: {individual.station_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant="secondary">
                        {individual.votes_count.toLocaleString('ar-EG')} صوت
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        #{individual.id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* زر تحميل المزيد */}
          {hasNextPage && (
            <div className="p-6 border-t border-border">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full"
                variant="outline"
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    تحميل المزيد
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}