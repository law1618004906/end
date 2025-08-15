'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import TopBar from "@/components/custom/top-bar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import GlobalProgress from "@/components/custom/global-progress";
import Breadcrumbs from "@/components/custom/breadcrumbs";
import { toast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Home, Users, UserCircle, GitBranch, BarChart3 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

// AppSidebar component
function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon" side="right">
      <SidebarHeader className="border-b">
        <div className="flex h-[52px] items-center px-3">
          <div className="text-sm font-medium text-sidebar-foreground">لوحة التحكم</div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold mb-4">القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link href="/" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-sidebar-accent">
                    <Home className="h-5 w-5" />
                    <span>الرئيسية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link href="/individuals" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-sidebar-accent">
                    <Users className="h-5 w-5" />
                    <span>الأفراد</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link href="/leaders" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-sidebar-accent">
                    <UserCircle className="h-5 w-5" />
                    <span>القادة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link href="/leaders-tree" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-sidebar-accent">
                    <GitBranch className="h-5 w-5" />
                    <span>شجرة القادة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link href="/reports" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-sidebar-accent">
                    <BarChart3 className="h-5 w-5" />
                    <span>التقارير</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          نظام إدارة البيانات الانتخابية
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // إعداد QueryClient مع Error Handling محسن
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast({
          title: "خطأ في تحميل البيانات",
          description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
        console.error('Query error:', error, 'Query key:', query.queryKey);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        toast({
          title: "خطأ في العملية",
          description: error instanceof Error ? error.message : "فشلت العملية",
          variant: "destructive",
        });
        console.error('Mutation error:', error, 'Mutation key:', mutation.options.mutationKey);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 دقائق
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          if (error?.status === 401 || error?.status === 403) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 1,
      },
    },
  }));
  
  const pathname = usePathname();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className="dark">
      <body
        className={`min-h-screen antialiased ${cairo.variable} ${geistSans.variable} ${geistMono.variable} font-[var(--font-cairo)] bg-background text-foreground`}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SidebarProvider>
              {/* الشريط الجانبي مخفي في صفحة تسجيل الدخول */}
              {!(pathname?.startsWith('/login')) && <AppSidebar />}
              <SidebarInset>
                <main className="flex-1 overflow-auto">
                  {/* شريط التنقل العلوي مخفي في صفحة تسجيل الدخول */}
                  {!(pathname?.startsWith('/login')) && <TopBar />}
                  <div className="container mx-auto px-4 py-6">
                    {/* Breadcrumbs مخفي في صفحة تسجيل الدخول */}
                    {!(pathname?.startsWith('/login')) && <Breadcrumbs />}
                    {!(pathname?.startsWith('/login')) && <div className="mb-4"></div>}
                    {children}
                  </div>
                </main>
              </SidebarInset>
            </SidebarProvider>
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <Toaster />
        <GlobalProgress />
      </body>
    </html>
  );
}
