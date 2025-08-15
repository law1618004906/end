import { db } from '../src/lib/db';

async function seed() {
  console.log('Seeding database...');

  try {
    // بذر بيانات افتراضية للقادة إذا لم تكن موجودة
    const leaderCount = await db.leaders.count();
    if (leaderCount === 0) {
      console.log('إنشاء بيانات تجريبية للقادة...');
      
      await db.leaders.createMany({
        data: [
          {
            full_name: 'محمد علي الحميداوي',
            residence: 'النجف الأشرف',
            phone: '07801234567',
            workplace: 'وزارة التربية',
            center_info: 'مركز النجف',
            station_number: '001',
            votes_count: 150
          },
          {
            full_name: 'فاطمة حسن الموسوي',
            residence: 'الكوفة',
            phone: '07707654321',
            workplace: 'مستشفى الصدر',
            center_info: 'مركز الكوفة',
            station_number: '002',
            votes_count: 120
          },
          {
            full_name: 'أحمد كاظم الحكيم',
            residence: 'النجف الأشرف',
            phone: '07901111222',
            workplace: 'جامعة الكوفة',
            center_info: 'مركز النجف',
            station_number: '003',
            votes_count: 90
          }
        ]
      });
      
      console.log('✅ تم إنشاء بيانات تجريبية للقادة');
    }

    // بذر بيانات افتراضية للأفراد إذا لم تكن موجودة
    const personCount = await db.persons.count();
    if (personCount === 0) {
      console.log('إنشاء بيانات تجريبية للأفراد...');
      
      await db.persons.createMany({
        data: [
          {
            leader_name: 'محمد علي الحميداوي',
            full_name: 'علي محمد الحميداوي',
            residence: 'النجف الأشرف',
            phone: '07801234568',
            workplace: 'معلم',
            center_info: 'مركز النجف',
            station_number: '001',
            votes_count: 1
          },
          {
            leader_name: 'محمد علي الحميداوي',
            full_name: 'سارة أحمد النجفي',
            residence: 'النجف الأشرف',
            phone: '07801234569',
            workplace: 'طبيبة',
            center_info: 'مركز النجف',
            station_number: '001',
            votes_count: 1
          },
          {
            leader_name: 'فاطمة حسن الموسوي',
            full_name: 'حسن علي الكوفي',
            residence: 'الكوفة',
            phone: '07707654322',
            workplace: 'مهندس',
            center_info: 'مركز الكوفة',
            station_number: '002',
            votes_count: 1
          }
        ]
      });
      
      console.log('✅ تم إنشاء بيانات تجريبية للأفراد');
    }

    // إنشاء مستخدم آدمن افتراضي
    const adminExists = await db.user.findUnique({ 
      where: { username: 'فقار' } 
    });
    
    if (!adminExists) {
      await db.user.create({
        data: {
          username: 'فقار',
          password: '123456',
          name: 'الآدمن الرئيسي',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ تم إنشاء المستخدم الآدمن الافتراضي');
    } else {
      console.log('ℹ️ المستخدم الآدمن موجود بالفعل');
    }

    console.log('✅ تم بذر قاعدة البيانات بنجاح');

  } catch (error) {
    console.error('❌ خطأ في بذر قاعدة البيانات:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// تشغيل السكريبت مع معالجة الأخطاء والإنهاء الصحيح
seed()
  .then(() => {
    console.log('🔚 تم الانتهاء من بذر قاعدة البيانات');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل سكريبت البذر:', error);
    process.exit(1);
  });
