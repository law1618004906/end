// استخدام عميل Prisma واحد عبر التطبيق لتفادي تعدد الاتصالات والمشاكل في التطوير
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import logger from './logger';

declare global {
  var prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// في بيئة التطوير، خزن النسخة على global لتفادي إنشاء عميل جديد مع كل HMR
if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}

// تسجيل اتصال قاعدة البيانات
db.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully');
  })
  .catch((error) => {
    logger.error('❌ Failed to connect to database', error);
  });

export default db;