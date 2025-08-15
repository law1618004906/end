#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="database_backup_$DATE.sqlite"

# تنزيل قاعدة البيانات من التطبيق
echo "📥 تنزيل قاعدة البيانات..."
az webapp ssh --resource-group "end-rg" --name "end-admin-app-1754695871" --slot production --command "cp /app/prisma/dev.db /tmp/backup.db"

# رفع قاعدة البيانات إلى Azure Storage
echo "☁️ رفع النسخة الاحتياطي إلى Azure Storage..."
az storage blob upload   --account-name "endbackupstorage1754708531"   --account-key ""   --container-name "app-backups"   --name "db/$BACKUP_FILE"   --file "/tmp/backup.db"   --overwrite

echo "✅ تم حفظ النسخة الاحتياطي: $BACKUP_FILE"

# حذف النسخ القديمة (أكبر من 30 يوم)
echo "🧹 تنظيف النسخ القديمة..."
az storage blob list   --account-name "endbackupstorage1754708531"   --account-key ""   --container-name "app-backups"   --prefix "db/"   --query "[?properties.lastModified < '2025-07-09'].name"   -o tsv | xargs -I {} az storage blob delete   --account-name "endbackupstorage1754708531"   --account-key ""   --container-name "app-backups"   --name {}
