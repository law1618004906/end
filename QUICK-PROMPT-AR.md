# 🚀 برومبت سريع - نظام إدارة البيانات الانتخابية v1.19

أنشئ نظام إدارة انتخابية متطور باللغة العربية مع **عرض شجري تفاعلي** للقادة والأفراد.

## المطلوب الأساسي

### التقنيات
- Next.js 15 + TypeScript + Tailwind CSS
- SQLite + Prisma ORM  
- JWT Authentication + HttpOnly Cookies
- shadcn/ui + Lucide Icons + خط Cairo للعربية

### الميزات الرئيسية
1. **العرض الشجري التفاعلي** `/leaders-tree`
   - هيكل هرمي: قادة ← أفراد
   - توسيع/طي الأفرع بسلاسة
   - عرض تفاصيل عند النقر
   - تصميم بنفسجي متدرج مع أيقونات Crown/User

2. **مصادقة آمنة**
   - آدمن رئيسي: `فقار` / `123456` (دائم)
   - JWT + HttpOnly Cookies
   - Rate limiting: 5 محاولات/15 دقيقة

3. **إدارة البيانات**
   - جدول `leaders` (القادة)
   - جدول `persons` (مرتبط بـ `leader_name`)
   - بحث متقدم + keyset pagination

4. **واجهة عربية RTL**
   - شريط جانبي تفاعلي
   - تصميم متجاوب ومحسن للعربية

## قاعدة البيانات

```sql
-- القادة
CREATE TABLE leaders (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  residence TEXT, phone TEXT,
  workplace TEXT, center_info TEXT,
  station_number TEXT,
  votes_count INTEGER DEFAULT 0,
  created_at DATETIME, updated_at DATETIME
);

-- الأفراد (مرتبطين بالقادة)
CREATE TABLE persons (
  id INTEGER PRIMARY KEY,
  leader_name TEXT NOT NULL,  -- ربط مع leaders.full_name
  full_name TEXT NOT NULL,
  residence TEXT, phone TEXT,
  workplace TEXT, center_info TEXT,
  station_number TEXT,
  votes_count INTEGER DEFAULT 0,
  created_at DATETIME, updated_at DATETIME
);

-- المستخدمين
CREATE TABLE User (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT, role TEXT DEFAULT 'ADMIN',
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME
);
```

## API العرض الشجري الأساسي

```typescript
// /api/leaders-tree
export async function GET(request: NextRequest) {
  return requireAuth(async () => {
    const leaders = await db.leaders.findMany();
    
    const tree = await Promise.all(leaders.map(async (leader) => {
      const persons = await db.persons.findMany({
        where: { leader_name: leader.full_name }
      });

      return {
        id: `leader-${leader.id}`,
        name: leader.full_name,
        type: 'leader',
        totalVotes: leader.votes_count + persons.reduce((sum, p) => sum + p.votes_count, 0),
        details: { phone: leader.phone, address: leader.residence },
        children: persons.map(person => ({
          id: `person-${person.id}`,
          name: person.full_name,
          type: 'person',
          totalVotes: person.votes_count,
          details: { phone: person.phone, address: person.residence },
          children: []
        }))
      };
    }));

    return NextResponse.json({ tree });
  })(request);
}
```

## مكون العرض الشجري

```tsx
// /leaders-tree/page.tsx
'use client';
import { Crown, User, ChevronRight, ChevronDown } from 'lucide-react';

export default function LeadersTreePage() {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const TreeNode = ({ node, level = 0 }) => (
    <div style={{ marginRight: `${level * 20}px` }}>
      <div className="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-purple-50"
           onClick={() => setSelected(node)}>
        {node.children?.length > 0 && (
          expanded.has(node.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        )}
        {node.type === 'leader' ? <Crown className="text-purple-600" /> : <User />}
        <span>{node.name}</span>
        <span className="bg-purple-100 px-2 py-1 rounded">{node.totalVotes} صوت</span>
      </div>
      
      {expanded.has(node.id) && node.children?.map(child => (
        <TreeNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-8">العرض الشجري للقادة والأفراد</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {tree.map(node => <TreeNode key={node.id} node={node} />)}
        </div>
        <div>
          {selected && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-xl font-bold mb-4">التفاصيل</h3>
              <p><strong>الاسم:</strong> {selected.name}</p>
              <p><strong>الهاتف:</strong> {selected.details.phone}</p>
              <p><strong>الأصوات:</strong> {selected.totalVotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## بيانات تجريبية

```javascript
// prisma/seed.ts
const leaders = [
  { full_name: "أحمد محمد علي", phone: "07701234567", residence: "بغداد - الكرادة", votes_count: 250 },
  { full_name: "فاطمة حسن كريم", phone: "07712345678", residence: "بغداد - المنصور", votes_count: 180 }
];

const persons = [
  { leader_name: "أحمد محمد علي", full_name: "سارة أحمد محمد", phone: "07701234568", votes_count: 45 },
  { leader_name: "فاطمة حسن كريم", full_name: "علي حسن محمود", phone: "07712345679", votes_count: 38 }
];
```

## الأوامر السريعة

```bash
npx create-next-app@latest electoral-system --typescript --tailwind --app
npm install @prisma/client prisma jsonwebtoken @radix-ui/react-* lucide-react
npx prisma init && npx prisma db push && npx prisma db seed
npm run dev
```

## اختبار النجاح
- تسجيل دخول: `فقار` / `123456`
- زيارة `/leaders-tree`
- النقر على القادة ومشاهدة التفاصيل
- توسيع الأفرع وطيها

**النتيجة**: نظام عرض شجري تفاعلي متطور باللغة العربية 🎉
