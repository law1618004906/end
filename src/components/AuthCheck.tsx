'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthCheckProps {
  children: React.ReactNode;
}

export default function AuthCheck({ children }: AuthCheckProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // إذا كان في صفحة تسجيل الدخول، لا تحقق
        if (pathname === '/login') {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
          setAuthenticated(true);
        } else {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // إذا كان في صفحة تسجيل الدخول، اعرض المحتوى مباشرة
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // إذا كان يحمل، اعرض شاشة تحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا كان مصادق عليه، اعرض المحتوى
  if (authenticated) {
    return <>{children}</>;
  }

  // خلاف ذلك، لا تعرض شيء (سيتم التوجه لصفحة الدخول)
  return null;
}
