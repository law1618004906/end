// Middleware حماية المستخدم الآدمن الرئيسي
// يمنع أي محاولة لحذف أو تعديل المستخدم الآدمن الرئيسي

import { NextRequest, NextResponse } from 'next/server';

const ROOT_ADMIN_ID = 'admin-root-permanent';
const ROOT_ADMIN_USERNAME = 'فقار';

// التحقق من محاولة تعديل المستخدم الآدمن الرئيسي
export function protectRootAdminMiddleware(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.pathname;
  const method = request.method;

  // حماية من حذف المستخدم الآدمن الرئيسي
  if (method === 'DELETE' && url.includes('/api/users/')) {
    const userId = url.split('/').pop();
    if (userId === ROOT_ADMIN_ID) {
      return NextResponse.json(
        { error: 'لا يمكن حذف المستخدم الآدمن الرئيسي' },
        { status: 403 }
      );
    }
  }

  // حماية من تعديل صلاحيات المستخدم الآدمن الرئيسي
  if ((method === 'PUT' || method === 'PATCH') && url.includes('/api/users/')) {
    const userId = url.split('/').pop();
    if (userId === ROOT_ADMIN_ID) {
      // السماح فقط بتحديث معلومات أساسية، منع تغيير الدور
      return NextResponse.json(
        { error: 'لا يمكن تعديل صلاحيات المستخدم الآدمن الرئيسي' },
        { status: 403 }
      );
    }
  }

  return null; // السماح بالمتابعة
}

// التحقق من أن المستخدم هو الآدمن الرئيسي
export function isRootAdmin(user: any): boolean {
  return user?.id === ROOT_ADMIN_ID || user?.username === ROOT_ADMIN_USERNAME;
}

// ضمان صلاحيات ADMIN للمستخدم الرئيسي
export function ensureRootAdminPermissions(user: any): any {
  if (isRootAdmin(user)) {
    return {
      ...user,
      role: 'ADMIN',
      isActive: true,
      permissions: ['all'] // صلاحيات كاملة
    };
  }
  return user;
}
