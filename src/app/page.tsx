'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LeaderPieChart from '@/components/LeaderPieChart';
import { useAuth } from '@/hooks/use-auth';

// نوع إحصائيات اللوحة
type DashboardStats = {
  totalLeaders: number;
  totalPersons: number;
  totalVotes: number;
  leadersDistribution?: { leaderId: number | null; leaderName: string; count: number }[];
};

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // حالة الرسم
  const [chartLoading, setChartLoading] = useState(true);
  const [chartErr, setChartErr] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ name: string; value: number; __percent?: number }[]>([]);

  // إعادة توجيه للدخول إذا لم يكن المستخدم مسجل
  useEffect(() => {
    // إضافة تأخير قصير لتجنب redirect loops أثناء تحميل auth
    const timer = setTimeout(() => {
      if (!authLoading && !user) {
        console.log('Redirecting to login - user not authenticated');
        window.location.href = '/login';
        return;
      }
    }, 100); // تأخير 100ms لتجنب race conditions

    return () => clearTimeout(timer);
  }, [authLoading, user]);

  useEffect(() => {
    // تحميل البيانات فقط إذا كان المستخدم مسجل الدخول
    if (!user) return;
    
    let mounted = true;
    setLoading(true);
    setChartLoading(true);
    fetch('/api/dashboard/stats', { cache: 'no-store', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/login';
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as DashboardStats;
        if (!mounted) return;
        setStats({
          totalLeaders: json.totalLeaders,
          totalPersons: json.totalPersons,
          totalVotes: json.totalVotes,
          leadersDistribution: json.leadersDistribution,
        } as any);

        // اعداد بيانات الرسم من leadersDistribution
        const dist = Array.isArray(json.leadersDistribution) ? json.leadersDistribution! : [];
        let rows = dist.map(d => ({
          name: d.leaderName || 'غير معلوم',
          value: Number(d.count || 0),
        }));
        // في حال لا توجد بيانات، اجعل صفاً افتراضياً
        if (!rows.length) rows = [{ name: 'غير معلوم', value: 0 }];

        const total = rows.reduce((s, r) => s + (r.value || 0), 0);
        const withPercent = rows.map(r => ({ ...r, __percent: total > 0 ? (r.value / total) * 100 : 0 }));
        setChartData(withPercent);
        setChartErr(null);
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || 'فشل الجلب');
        setChartErr(e?.message || 'فشل جلب بيانات الرسم');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
        setChartLoading(false);
      });

    return () => { mounted = false; };
  }, [user]);

  // إظهار حالة التحميل إذا كان التحقق من المصادقة قيد التحميل
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  // إعادة توجيه للدخول إذا لم يكن مسجل
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">جاري التوجيه لصفحة تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-destructive">حدث خطأ: {err}</div>
          <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* العنوان الرئيسي */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground">مراقبة وإدارة البيانات</p>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* إجمالي القادة */}
        <div className="bg-card/60 border border-border rounded-lg p-4 text-center hover:bg-card/80 transition-all duration-200 backdrop-blur-sm">
          <div className="text-2xl font-bold text-primary mb-1">
            {stats?.totalLeaders || 0}
          </div>
          <div className="text-sm text-muted-foreground">إجمالي القادة</div>
        </div>

        {/* إجمالي الأفراد */}
        <div className="bg-card/60 border border-border rounded-lg p-4 text-center hover:bg-card/80 transition-all duration-200 backdrop-blur-sm">
          <div className="text-2xl font-bold text-primary mb-1">
            {stats?.totalPersons || 0}
          </div>
          <div className="text-sm text-muted-foreground">إجمالي الأفراد</div>
        </div>

        {/* إجمالي الأصوات */}
        <div className="bg-card/60 border border-border rounded-lg p-4 text-center hover:bg-card/80 transition-all duration-200 backdrop-blur-sm">
          <div className="text-2xl font-bold text-primary mb-1">
            {stats?.totalVotes || 0}
          </div>
          <div className="text-sm text-muted-foreground">إجمالي الأصوات</div>
        </div>
      </div>

      {/* الإجراءات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/individuals">
          <div className="bg-card/40 hover:bg-card/70 border border-border rounded-lg p-4 cursor-pointer group transition-all duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/20 border border-border rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                إدارة الأفراد
              </h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              عرض وإدارة بيانات الأفراد، التحرير والبحث المتقدم
            </p>
          </div>
        </Link>

        <Link href="/leaders">
          <div className="bg-card/40 hover:bg-card/70 border border-border rounded-lg p-4 cursor-pointer group transition-all duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/20 border border-border rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                إدارة القادة
              </h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              عرض وإدارة بيانات القادة والإشراف على الفرق
            </p>
          </div>
        </Link>
      </div>

      {/* التوزيع الدائري للأفراد حسب القادة */}
      <div className="bg-card/30 border border-border rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 border border-border rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            التوزيع الدائري للأفراد حسب القادة
          </h2>
        </div>
        <div className="text-center text-muted-foreground text-sm mb-4">
          اضغط على أي جزء من الرسم لعرض التفاصيل
        </div>
        
        {chartLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          </div>
        ) : chartErr ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-destructive mb-2">⚠️ خطأ في تحميل الرسم البياني</div>
              <div className="text-sm text-muted-foreground">{chartErr}</div>
            </div>
          </div>
        ) : (
          <div className="bg-background/50 border border-border rounded-lg p-4">
            <LeaderPieChart data={chartData} />
          </div>
        )}
      </div>
    </div>
  );
}
