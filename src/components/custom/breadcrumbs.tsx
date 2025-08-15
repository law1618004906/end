'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const pathNames: Record<string, string> = {
  '/': 'الرئيسية',
  '/individuals': 'الأفراد',
  '/leaders': 'القادة',
  '/leaders-tree': 'شجرة القادة',
  '/reports': 'التقارير',
  '/activity-logs': 'سجل الأنشطة',
  '/roles': 'الأدوار',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  if (pathname === '/login') return null;

  const pathSegments = pathname.split('/').filter(Boolean);
  
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4" dir="rtl">
      <Link href="/" className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4 ml-1" />
        الرئيسية
      </Link>
      
      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const name = pathNames[path] || segment;
        const isLast = index === pathSegments.length - 1;
        
        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/60" />
            {isLast ? (
              <span className="text-foreground font-medium">{name}</span>
            ) : (
              <Link href={path} className="hover:text-foreground">
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
