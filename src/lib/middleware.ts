import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from './auth';
import { ensureRootAdminPermissions } from './root-admin-protection';

export async function getAuthenticatedUser(request: NextRequest) {
  // حاول أولاً قراءة التوكن من الكوكي HttpOnly الذي نضبطه عند تسجيل الدخول
  const cookieToken =
    request.cookies.get('__Host-session')?.value ||
    request.cookies.get('session')?.value;
  // في بيئة الإنتاج: نعتمد فقط على الكوكي HttpOnly ولا نسمح بهيدر Authorization
  const token = cookieToken;
  console.log('Auth middleware - token found:', !!token);
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  console.log('Auth middleware - token payload:', payload);
  
  if (!payload || !payload.userId) {
    console.log('Auth middleware - invalid payload');
    return null;
  }

  try {
    const user = await getUserById(payload.userId);
    console.log('Auth middleware - user found:', !!user);
    // تطبيق حماية المستخدم الآدمن الرئيسي
    return ensureRootAdminPermissions(user);
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, user);
  };
}

// Helper: parse permissions from user.roleRel.permissions (JSON array or comma-separated string)
function getUserPermissions(user: any): string[] {
  try {
    const raw = user?.roleRel?.permissions;
    if (!raw) return [];
    if (typeof raw === 'string') {
      // Try JSON first
      if (raw.trim().startsWith('[')) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map((s) => String(s)) : [];
      }
      // Fallback comma-separated
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(raw)) return raw.map((s) => String(s));
    return [];
  } catch {
    return [];
  }
}

// Support two usages:
// 1) Wrapper: requirePermission('perm')(handler) -> returns a handler protected by auth+permission
// 2) Predicate: requirePermission('perm')(request, user) -> returns boolean for inline checks
export function requirePermission(permission: string) {
  return function (
    arg1: ((request: NextRequest, user: any) => Promise<NextResponse>) | NextRequest,
    arg2?: any
  ): any {
    // Predicate style: (request, user) => boolean
    if (arg1 && typeof arg1 !== 'function' && arg2 !== undefined) {
      const user = arg2;
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      const perms = getUserPermissions(user);
      return perms.includes(permission) || perms.includes('all');
    }

    // Wrapper style: (handler) => protectedHandler
    const handler = arg1 as (request: NextRequest, user: any) => Promise<NextResponse>;
    return requireAuth(async (request: NextRequest, user: any): Promise<NextResponse> => {
      if (user.role === 'ADMIN') {
        return handler(request, user);
      }
      const perms = getUserPermissions(user);
      if (perms.includes(permission) || perms.includes('all')) {
        return handler(request, user);
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    });
  };
}

export function requireRole(roleName: string) {
  return function(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
    return requireAuth(async (request: NextRequest, user: any): Promise<NextResponse> => {
      if (user.role === roleName || user.role === 'ADMIN') {
        return handler(request, user);
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    });
  };
}