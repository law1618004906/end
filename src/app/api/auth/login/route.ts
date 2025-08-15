import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

// قائمة المدراء المسموح لهم بالدخول
import { authenticateUser, generateToken } from '@/lib/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة السر مطلوبة'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    // التحقق من Rate Limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `login:${clientIP}:${username}`;
    const rateCheck = checkRateLimit(rateLimitKey);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `تم تجاوز عدد محاولات تسجيل الدخول. حاول مرة أخرى بعد ${rateCheck.timeLeft} ثانية`,
          timeLeft: rateCheck.timeLeft 
        },
        { status: 429 }
      );
    }

    // التحقق من المستخدم عبر الدالة المركزية
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'بيانات الاعتماد غير صحيحة' },
        { status: 401 }
      );
    }

    // إعادة تعيين rate limit عند نجاح تسجيل الدخول
    resetRateLimit(rateLimitKey);

    // إنشاء توكن بسيط
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role || 'ADMIN',
    });

    // أنشئ الاستجابة ثم عيّن كوكي الجلسة (__Host-session) + كوكي CSRF
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role || 'ADMIN',
      },
    });

    const secure = request.nextUrl.protocol === 'https:';
    // Use Host prefix only on HTTPS; in HTTP dev, use a normal cookie name
    const sessionCookieName = secure ? '__Host-session' : 'session';
    response.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      // آمن فقط عند https لضمان عمله محليًا على http
      secure,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 أيام
    });

    // CSRF cookie (double-submit): readable cookie + header validation on unsafe methods
    const csrf = generateCsrfToken();
    setCsrfCookie(response, csrf, secure);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'بيانات الاعتماد غير صحيحة' },
      { status: 401 }
    );
  }
}