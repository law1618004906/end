import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// المصادقة المؤمنة - تحقق من username وكلمة السر مع ضمان وجود الآدمن الرئيسي
export async function authenticateUser(username: string, password: string) {
  try {
    // التحقق من الآدمن الرئيسي الدائم أولاً (ROOT ACCESS)
    if (username === 'فقار' && password === '123456') {
      // إرجاع بيانات الآدمن الرئيسي مباشرة (غير قابل للتغيير)
      return {
        id: 'admin-root-permanent',
        username: 'فقار',
        password: '123456',
        name: 'الآدمن الرئيسي',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      };
    }

    // البحث عن المستخدمين الآخرين في قاعدة البيانات
    const users = await db.user.findMany({
      where: { username: username }
    });

    const user = users[0]; // أخذ أول مستخدم مطابق

    // تحقق من كلمة السر والحالة النشطة
    if (user && user.password === password && user.isActive) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    // في حالة خطأ في قاعدة البيانات، السماح للآدمن الرئيسي بالدخول
    if (username === 'فقار' && password === '123456') {
      return {
        id: 'admin-root-permanent',
        username: 'فقار',
        password: '123456',
        name: 'الآدمن الرئيسي',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      };
    }
    return null;
  }
}

// توليد JWT token
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// التحقق من JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// الحصول على المستخدم بالـ ID
export async function getUserById(userId: string) {
  try {
    // التحقق من الآدمن الرئيسي الدائم أولاً
    if (userId === 'admin-root-permanent') {
      return {
        id: 'admin-root-permanent',
        username: 'فقار',
        password: '123456',
        name: 'الآدمن الرئيسي',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      };
    }

    // البحث في قاعدة البيانات للمستخدمين الآخرين
    return await db.user.findUnique({
      where: { id: userId }
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    // في حالة خطأ، إرجاع الآدمن الرئيسي إذا كان المطلوب
    if (userId === 'admin-root-permanent') {
      return {
        id: 'admin-root-permanent',
        username: 'فقار',
        password: '123456',
        name: 'الآدمن الرئيسي',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date()
      };
    }
    return null;
  }
}
