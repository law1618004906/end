'use client';

import { useAuth } from './use-auth';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    
    // TODO: Implement permission checking logic based on user role
    // This should check user.roleRel.permissions when available
    return false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role || user.role === 'ADMIN';
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    has: hasPermission, // إضافة alias للتوافق مع الكود الموجود
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    userRole: user?.role,
    isAdmin: user?.role === 'ADMIN',
    isAuthenticated: !!user,
    loading: false, // إضافة loading property
  };
}
