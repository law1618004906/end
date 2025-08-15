import crypto from 'crypto';
import { NextResponse } from 'next/server';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(response: NextResponse, token: string, secure: boolean = false) {
  response.cookies.set('csrf-token', token, {
    httpOnly: false, // يجب أن يكون قابل للقراءة من JS للإرسال في الهيدر
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 أيام
  });
}
