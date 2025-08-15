// حماية أمان إضافية للمستخدم الآدمن الرئيسي
// هذا الملف يضمن عدم التلاعب بالمستخدم الآدمن

import { db } from './db';

// بيانات المستخدم الآدمن الرئيسي (غير قابلة للتغيير)
export const ROOT_ADMIN = {
  id: 'admin-root-permanent',
  username: 'فقار',
  password: '123456',
  name: 'الآدمن الرئيسي',
  role: 'ADMIN',
  isActive: true
} as const;

// التحقق من أن المستخدم هو الآدمن الرئيسي
export function isRootAdmin(username: string): boolean {
  return username === ROOT_ADMIN.username;
}

// حماية من حذف أو تعديل المستخدم الآدمن الرئيسي
export async function protectRootAdmin() {
  try {
    // البحث عن المستخدم الآدمن
    const adminUser = await db.user.findUnique({
      where: { username: ROOT_ADMIN.username }
    });

    // إذا لم يوجد، أنشئه فوراً
    if (!adminUser) {
      await db.user.create({
        data: ROOT_ADMIN
      });
      console.log('🔒 تم إعادة إنشاء المستخدم الآدمن الرئيسي');
      return;
    }

    // التأكد من أن بياناته صحيحة
    let needsUpdate = false;
    const updateData: any = {};

    if (adminUser.role !== ROOT_ADMIN.role) {
      updateData.role = ROOT_ADMIN.role;
      needsUpdate = true;
    }

    if (!adminUser.isActive) {
      updateData.isActive = ROOT_ADMIN.isActive;
      needsUpdate = true;
    }

    if (adminUser.password !== ROOT_ADMIN.password) {
      updateData.password = ROOT_ADMIN.password;
      needsUpdate = true;
    }

    // تحديث البيانات إذا كانت غير صحيحة
    if (needsUpdate) {
      await db.user.update({
        where: { username: ROOT_ADMIN.username },
        data: updateData
      });
      console.log('🔒 تم تصحيح بيانات المستخدم الآدمن الرئيسي');
    }

  } catch (error) {
    console.error('❌ خطأ في حماية المستخدم الآدمن:', error);
  }
}

// منع حذف المستخدم الآدمن الرئيسي
export function preventRootAdminDeletion(userId: string): boolean {
  return userId === ROOT_ADMIN.id;
}

// منع تعديل صلاحيات المستخدم الآدمن الرئيسي
export function preventRootAdminModification(userId: string, changes: any): boolean {
  if (userId === ROOT_ADMIN.id) {
    // منع تغيير الدور أو إلغاء التفعيل
    if (changes.role && changes.role !== ROOT_ADMIN.role) {
      return true;
    }
    if (changes.isActive === false) {
      return true;
    }
  }
  return false;
}
