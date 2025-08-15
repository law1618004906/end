'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function TopBar() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-card/60 border-border shadow-sm border-b">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          مرحباً، {user.name || user.username}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2 border-border"
      >
        <LogOut className="h-4 w-4" />
        تسجيل الخروج
      </Button>
    </div>
  );
}
