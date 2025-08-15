// Simple in-memory rate limiting
interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): { allowed: boolean; timeLeft?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry) {
    rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // إذا كان محظور، تحقق من انتهاء فترة الحظر
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, timeLeft: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  
  // إعادة تعيين العداد إذا انتهت النافذة الزمنية
  if (now - entry.lastAttempt > windowMs) {
    entry.attempts = 1;
    entry.lastAttempt = now;
    delete entry.blockedUntil;
    return { allowed: true };
  }
  
  // زيادة عدد المحاولات
  entry.attempts++;
  entry.lastAttempt = now;
  
  // حظر إذا تم تجاوز الحد الأقصى
  if (entry.attempts > maxAttempts) {
    entry.blockedUntil = now + windowMs;
    return { allowed: false, timeLeft: Math.ceil(windowMs / 1000) };
  }
  
  return { allowed: true };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// تنظيف الذاكرة كل ساعة
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.blockedUntil && entry.blockedUntil < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);
