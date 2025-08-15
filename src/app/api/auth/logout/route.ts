import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // إنشاء response لمسح الـ cookies
    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    
    // مسح جميع الـ cookies المتعلقة بالمصادقة
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0, // مسح الكوكي فوراً
      path: '/',
    };

    // مسح الكوكيز المختلفة
    response.cookies.set('__Host-session', '', cookieOptions);
    response.cookies.set('session', '', cookieOptions);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'خطأ في تسجيل الخروج' },
      { status: 500 }
    );
  }
}
