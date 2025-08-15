import { ApplicationInsights } from '@microsoft/applicationinsights-web';

class AzureLogger {
  private appInsights: ApplicationInsights | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // فقط في المتصفح وإذا كان لدينا Instrumentation Key
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AZURE_INSTRUMENTATION_KEY) {
      try {
        this.appInsights = new ApplicationInsights({
          config: {
            instrumentationKey: process.env.NEXT_PUBLIC_AZURE_INSTRUMENTATION_KEY,
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true,
            enableAjaxErrorStatusText: true,
            enableAjaxPerfTracking: true,
            enableUnhandledPromiseRejectionTracking: true,
            disableExceptionTracking: false,
            disableTelemetry: false,
            enableDebug: process.env.NODE_ENV === 'development',
            cookieCfg: {
              enabled: true,
              domain: process.env.NODE_ENV === 'production' ? '.azurewebsites.net' : undefined,
            },
            extensions: [],
            extensionConfig: {}
          }
        });

        this.appInsights.loadAppInsights();
        this.appInsights.trackPageView();
        this.isInitialized = true;

        console.log('✅ Azure Application Insights initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Azure Application Insights:', error);
      }
    }
  }

  // تسجيل الأحداث المخصصة
  trackEvent(name: string, properties?: { [key: string]: any }, measurements?: { [key: string]: number }) {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.trackEvent({
        name,
        properties,
        measurements
      });
    }
  }

  // تسجيل الأخطاء
  trackException(error: Error, properties?: { [key: string]: any }) {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.trackException({
        exception: error,
        properties
      });
    }
  }

  // تسجيل التتبع
  trackTrace(message: string, severityLevel?: number, properties?: { [key: string]: any }) {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.trackTrace({
        message,
        severityLevel,
        properties
      });
    }
  }

  // تسجيل المقاييس
  trackMetric(name: string, average: number, properties?: { [key: string]: any }) {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.trackMetric({
        name,
        average,
        properties
      });
    }
  }

  // تسجيل التبعيات
  trackDependency(name: string, data: string, duration: number, success: boolean, responseCode?: number) {
    if (this.appInsights && this.isInitialized) {
      const dependencyData: any = {
        name,
        data,
        duration,
        success
      };
      
      if (responseCode !== undefined) {
        dependencyData.responseCode = responseCode;
      }
      
      this.appInsights.trackDependencyData(dependencyData);
    }
  }

  // تسجيل طلبات الـ API
  trackApiCall(method: string, url: string, duration: number, responseCode: number, success: boolean) {
    this.trackEvent('API_Call', {
      method,
      url,
      responseCode: responseCode.toString(),
      success: success.toString()
    }, {
      duration
    });
  }

  // تسجيل أنشطة المستخدم
  trackUserActivity(action: string, userId?: string, properties?: { [key: string]: any }) {
    this.trackEvent('User_Activity', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...properties
    });
  }

  // تسجيل أداء الصفحة
  trackPagePerformance(pageName: string, loadTime: number) {
    this.trackMetric('Page_Load_Time', loadTime, {
      pageName,
      timestamp: new Date().toISOString()
    });
  }

  // إعداد معلومات المستخدم
  setUserId(userId: string) {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.setAuthenticatedUserContext(userId);
    }
  }

  // إزالة معلومات المستخدم
  clearUserId() {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.clearAuthenticatedUserContext();
    }
  }

  // فلاش البيانات المعلقة
  flush() {
    if (this.appInsights && this.isInitialized) {
      this.appInsights.flush();
    }
  }
}

// Singleton instance
const azureLogger = new AzureLogger();

export default azureLogger;
export { AzureLogger };
