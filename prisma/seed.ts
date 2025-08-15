import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
const db = new PrismaClient();

// استبدال hashPassword مؤقتاً في سكربت الـ seed بوظيفة تولّد هاش SHA256 بسيط (غير مخصص للإنتاج)
async function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  // 1) Ensure base roles exist
  const roles = [
    { 
      name: 'ADMIN', 
      nameAr: 'مدير النظام', 
      permissions: JSON.stringify([
        'all',
        'individuals.read',
        'individuals.write', 
        'individuals.delete',
        'leaders.read',
        'leaders.write',
        'leaders.delete',
        'posts.read',
        'posts.write',
        'posts.delete',
        'messages.read',
        'messages.write',
        'messages.delete',
        'users.read',
        'users.write',
        'users.delete',
        'roles.read',
        'roles.write',
        'roles.delete',
        'reports.read',
        'backup.read',
        'setup.write'
      ])
    },
    { 
      name: 'USER', 
      nameAr: 'مستخدم عادي', 
      permissions: JSON.stringify([
        'individuals.read',
        'leaders.read',
        'posts.read'
      ])
    },
  ];

  for (const r of roles) {
    await db.role.upsert({
      where: { name: r.name },
      update: { nameAr: r.nameAr, permissions: r.permissions },
      create: { name: r.name, nameAr: r.nameAr, permissions: r.permissions },
    });
  }

  const adminRole = await db.role.findUnique({ where: { name: 'ADMIN' } });
  const userRole = await db.role.findUnique({ where: { name: 'USER' } });

  // إنشاء مستخدم admin افتراضي إذا لم يكن موجوداً
  const adminEmail = 'admin@hamidawi.com';
  const adminPassword = 'admin123';
  const adminExists = await db.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await db.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: 'مدير النظام',
        username: 'admin',
        role: 'ADMIN', // legacy text for backward compatibility
        roleId: adminRole?.id ?? null,
      },
    });
    console.log('Admin user created:', adminEmail);
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  // 2) Map existing users' legacy text role to roleId
  const allUsers = await db.user.findMany();
  for (const u of allUsers) {
    // Decide target roleId
    const targetRoleId = (u.role === 'ADMIN' ? adminRole?.id : userRole?.id) ?? userRole?.id ?? null;
    if (u.roleId !== targetRoleId) {
      await db.user.update({ where: { id: u.id }, data: { roleId: targetRoleId } });
    }
  }

  // عينات لجدول القادة leaders
  const leadersData = [
    {
      full_name: 'رسول ناظم',
      residence: 'بغداد',
      phone: '+9641111111111',
      workplace: 'مجتمع محلي',
      center_info: 'المركز الرئيسي - رقم 1',
      station_number: 'محطة 101',
      votes_count: 150,
    },
    {
      full_name: 'قائد تجريبي',
      residence: 'النجف',
      phone: '+9643333333333',
      workplace: 'منظمة محلية',
      center_info: 'مركز رقم 3',
      station_number: 'محطة 303',
      votes_count: 75,
    },
  ];

  // upsert للقادة عبر full_name كمعرّف منطقي مؤقت (SQLite لا يفرض uniqueness هنا، لكن للاختبار نستخدم where by full_name)
  for (const l of leadersData) {
    await db.leaders.upsert({
      where: { id: 1 }, // سنستخدم حيلة: نحاول على id ثابت ثم نُنشئ إن لم يوجد. لتفادي تعارض، سنحوّل هذا إلى createMany إذا لزم.
      update: {
        full_name: l.full_name,
        residence: l.residence,
        phone: l.phone,
        workplace: l.workplace,
        center_info: l.center_info,
        station_number: l.station_number,
        votes_count: l.votes_count ?? 0,
      },
      create: {
        full_name: l.full_name,
        residence: l.residence,
        phone: l.phone,
        workplace: l.workplace,
        center_info: l.center_info,
        station_number: l.station_number,
        votes_count: l.votes_count ?? 0,
      },
    });
  }

  // عينات لجدول الأفراد persons
  const personsData = [
    {
      leader_name: 'رسول ناظم',
      full_name: 'فرد عادي',
      residence: 'بغداد',
      phone: '+9642222222222',
      workplace: 'قطاع خاص',
      center_info: 'المركز الفرعي - رقم 2',
      station_number: 'محطة 202',
      votes_count: 25,
    },
    {
      leader_name: 'قائد تجريبي',
      full_name: 'فرد تجريبي',
      residence: 'النجف',
      phone: '+9644444444444',
      workplace: 'قطاع عام',
      center_info: 'مركز رقم 4',
      station_number: 'محطة 404',
      votes_count: 10,
    },
  ];

  // لإدراج أو تحديث الأفراد، سنستخدم upsert لكل عنصر لتفادي التكرارات
  for (const p of personsData) {
    // بما أنه لا يوجد حقل فريد سوى id، سنحاول أسلوبين:
    // 1) محاولة العثور على سجل مطابق بالاسم الكامل والـ leader_name (تقريب منطقي للاختبار)
    const existing = await db.persons.findFirst({
      where: {
        full_name: p.full_name,
        leader_name: p.leader_name,
      },
    });

    if (existing) {
      await db.persons.update({
        where: { id: existing.id },
        data: {
          residence: p.residence,
          phone: p.phone,
          workplace: p.workplace,
          center_info: p.center_info,
          station_number: p.station_number,
          votes_count: p.votes_count ?? 0,
        },
      });
    } else {
      await db.persons.create({
        data: {
          leader_name: p.leader_name,
          full_name: p.full_name,
          residence: p.residence,
          phone: p.phone,
          workplace: p.workplace,
          center_info: p.center_info,
          station_number: p.station_number,
          votes_count: p.votes_count ?? 0,
        },
      });
    }
  }

  console.log('Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })