#!/bin/bash

# سكريبت نشر التطبيق إلى Azure
set -e

echo "🚀 بدء نشر التطبيق إلى Azure..."

# التأكد من أن Docker يعمل
if ! docker --version &> /dev/null; then
    echo "❌ Docker غير مثبت أو لا يعمل"
    exit 1
fi

# إيقاف الحاويات الحالية إن وجدت
echo "🛑 إيقاف الحاويات الحالية..."
docker-compose -f docker-compose.azure.yml down || true

# إنشاء المجلدات المطلوبة
echo "📁 إنشاء المجلدات المطلوبة..."
mkdir -p ./data ./logs ./backups

# تشغيل التطبيق
echo "🔄 تشغيل التطبيق..."
docker-compose -f docker-compose.azure.yml up -d

# انتظار تشغيل التطبيق
echo "⏳ انتظار تشغيل التطبيق..."
sleep 30

# فحص الصحة
echo "🔍 فحص صحة التطبيق..."
for i in {1..10}; do
    if curl -f http://localhost:9000/api/health &> /dev/null; then
        echo "✅ التطبيق يعمل بنجاح!"
        break
    else
        echo "⏳ انتظار... المحاولة $i/10"
        sleep 10
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ فشل في تشغيل التطبيق"
        docker-compose -f docker-compose.azure.yml logs
        exit 1
    fi
done

# إعداد قاعدة البيانات
echo "🗄️ إعداد قاعدة البيانات..."
docker-compose -f docker-compose.azure.yml exec -T app npx prisma db push || true

# إنشاء المستخدم المدير
echo "👤 إنشاء المستخدم المدير..."
curl -X POST http://localhost:9000/api/setup/reset-admin || echo "⚠️ قد يكون المستخدم موجود مسبقاً"

echo "🎉 تم النشر بنجاح!"
echo "🌐 التطبيق متاح على: http://localhost:9000"
echo "👤 بيانات المدير:"
echo "   Email: admin@hamidawi.com"
echo "   Password: admin123"
echo ""
echo "📊 لرؤية السجلات: docker-compose -f docker-compose.azure.yml logs -f"
echo "🛑 لإيقاف التطبيق: docker-compose -f docker-compose.azure.yml down"
