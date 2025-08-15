import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Azure Application Insights للخادم
let appInsights: any = null;
if (typeof window === 'undefined' && process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  try {
    import('applicationinsights').then((ai) => {
      appInsights = ai;
      appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
      console.log('✅ Azure Application Insights (Server) initialized');
    });
  } catch (error) {
    console.warn('⚠️ Azure Application Insights (Server) initialization failed:', error);
  }
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private logDir: string;
  private currentLogFile: string;

  constructor() {
    // إنشاء مجلد logs إذا لم يكن موجوداً
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
    
    // ملف log حسب التاريخ
    const today = format(new Date(), 'yyyy-MM-dd');
    this.currentLogFile = path.join(this.logDir, `app-${today}.log`);
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
    
    if (entry.data) {
      return `${baseLog} | Data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.userId || entry.ip) {
      const metadata: string[] = [];
      if (entry.userId) metadata.push(`User: ${entry.userId}`);
      if (entry.ip) metadata.push(`IP: ${entry.ip}`);
      return `${baseLog} | ${metadata.join(' | ')}`;
    }
    
    return baseLog;
  }

  private writeToFile(entry: LogEntry) {
    try {
      const logLine = this.formatLogEntry(entry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private createLogEntry(
    level: LogEntry['level'], 
    message: string, 
    data?: any,
    metadata?: { userId?: string; ip?: string; userAgent?: string }
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...metadata
    };
  }

  // الدوال العامة للـ logging
  info(message: string, data?: any, metadata?: { userId?: string; ip?: string }) {
    const entry = this.createLogEntry('info', message, data, metadata);
    this.writeToFile(entry);
    
    // Console log في التطوير
    if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ ${message}`, data || '');
    }
  }

  warn(message: string, data?: any, metadata?: { userId?: string; ip?: string }) {
    const entry = this.createLogEntry('warn', message, data, metadata);
    this.writeToFile(entry);
    
    console.warn(`⚠️ ${message}`, data || '');
  }

  error(message: string, error?: Error | any, metadata?: { userId?: string; ip?: string }) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    
    const entry = this.createLogEntry('error', message, errorData, metadata);
    this.writeToFile(entry);
    
    console.error(`❌ ${message}`, errorData || '');
  }

  debug(message: string, data?: any, metadata?: { userId?: string; ip?: string }) {
    // فقط في التطوير
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry('debug', message, data, metadata);
      this.writeToFile(entry);
      console.debug(`🐛 ${message}`, data || '');
    }
  }

  // دوال خاصة للأنشطة
  userActivity(action: string, userId: string, details?: any, ip?: string) {
    this.info(`User Activity: ${action}`, details, { userId, ip });
  }

  apiCall(method: string, endpoint: string, userId?: string, ip?: string) {
    this.info(`API Call: ${method} ${endpoint}`, null, { userId, ip });
  }

  dbQuery(query: string, duration?: number) {
    this.debug(`Database Query: ${query}`, duration ? { duration: `${duration}ms` } : undefined);
  }

  // تنظيف الـ logs القديمة (أكبر من 30 يوم)
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      files.forEach(file => {
        if (file.startsWith('app-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Failed to clean old logs', error);
    }
  }

  // قراءة آخر N سطر من الـ logs
  getRecentLogs(lines: number = 100): string[] {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }

      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      return allLines.slice(-lines);
    } catch (error) {
      this.error('Failed to read recent logs', error);
      return [];
    }
  }

  // إحصائيات الـ logs
  getLogStats(): { totalLines: number; errorCount: number; warnCount: number } {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return { totalLines: 0, errorCount: 0, warnCount: 0 };
      }

      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const errorCount = lines.filter(line => line.includes('[ERROR]')).length;
      const warnCount = lines.filter(line => line.includes('[WARN]')).length;
      
      return {
        totalLines: lines.length,
        errorCount,
        warnCount
      };
    } catch (error) {
      this.error('Failed to get log stats', error);
      return { totalLines: 0, errorCount: 0, warnCount: 0 };
    }
  }
}

// Singleton instance
const logger = new Logger();

// تنظيف تلقائي كل يوم
setInterval(() => {
  logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

export default logger;
