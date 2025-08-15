'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [redirected, setRedirected] = useState(false);

  // إذا كان المستخدم مسجل دخول بالفعل، وجهه للصفحة الرئيسية
  useEffect(() => {
    if (user && !redirected) {
      setRedirected(true);
      router.push('/');
    }
  }, [user, router, redirected]);

  // إذا كان التطبيق لا يزال يحمل، لا تعرض شيء
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-foreground">جارِ التحميل...</div>
    </div>;
  }

  // إذا كان المستخدم مسجل دخول، لا تعرض صفحة تسجيل الدخول
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (success) {
        router.push('/');
      } else {
        setError('بيانات الدخول غير صحيحة');
      }
    } catch (error) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-screen flex items-center justify-center overflow-hidden bg-background" dir="rtl">
      {/* خلفية الصورة مع تأثير خفيف */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      ></div>
      
      <div className="flex flex-col items-center w-full max-w-lg px-6 relative z-10">
        {/* قسم اللوجو والعناوين */}
        <div className="text-center mb-6 bg-card/40 backdrop-blur-md rounded-2xl p-6 border border-border shadow-2xl w-full">
          {/* اللوجو */}
          <div className="mb-4">
            <img 
              src="/logo-official.png" 
              alt="شعار جمهورية العراق" 
              className="mx-auto h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-lg"
            />
          </div>
          
          {/* جمهورية العراق */}
          <h1 className="text-foreground text-lg md:text-xl font-bold mb-2 tracking-wide">
            جمهورية العراق
          </h1>
          
          {/* مكتب النائب */}
          <h2 className="text-foreground/90 text-base md:text-lg font-semibold leading-relaxed">
            مكتب النائب علي جاسم الحميداوي
          </h2>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <Card className="w-full backdrop-blur-md bg-card/50 border border-border shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/20 border border-border rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            أدخل بياناتك للوصول لنظام الإدارة الانتخابية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">
                اسم المستخدم
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-right bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-right pr-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 backdrop-blur-sm"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 hover:bg-accent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="bg-destructive/20 border-destructive/50 backdrop-blur-sm">
                <AlertDescription className="text-destructive-foreground text-right">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-muted-foreground w-full">
            نظام إدارة البيانات الانتخابية
            <br />
            <span className="text-xs text-muted-foreground/80">مطور بعناية للعمليات الديمقراطية</span>
          </p>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}