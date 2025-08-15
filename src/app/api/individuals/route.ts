import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

// أنواع مبسطة متوافقة مع الاستعمال الحالي في الواجهة
type RowPerson = {
  id: number;
  leader_name: string | null;
  full_name: string;
  residence: string | null;
  phone: string | null;
  workplace: string | null;
  center_info: string | null;
  station_number: string | null;
  votes_count: number;
  // created_at/updated_at أزلناها من الاستجابة لتقليل الحجم
};

type PersonPayload = RowPerson & {
  leader?: {
    full_name: string;
  } | null;
};

// === واجهات Metrics/Response خفيفة للاستخدام الداخلي ===
type Metrics = {
  dbQueryMs: number;
  serializeMs: number;
  totalMs: number;
  count: number;
};

type IndividualsResponse = {
  success: boolean;
  data: PersonPayload[];
  page: {
    hasNext: boolean;
    nextCursor: string | null;
    pageSize: number;
  };
  total?: number;
  meta?: {
    metrics: Metrics;
  };
};
// === نهاية الواجهات ===

// Helper: تحويل أي BigInt محتمل إلى Number، مع ضمان الحقول المطلوبة فقط
function mapPerson(p: any): PersonPayload {
  const idNum =
    typeof p.id === 'bigint' ? Number(p.id) :
    typeof p.id === 'number' ? p.id : Number(p.id);

  const votesNum =
    typeof p.votes_count === 'bigint' ? Number(p.votes_count) :
    typeof p.votes_count === 'number' ? p.votes_count : Number(p.votes_count ?? 0);

  const leaderName = p.leader_name ?? null;

  return {
    id: idNum,
    full_name: p.full_name,
    leader_name: leaderName,
    residence: p.residence ?? null,
    phone: p.phone ?? null,
    workplace: p.workplace ?? null,
    center_info: p.center_info ?? null,
    station_number: p.station_number ?? null,
    votes_count: votesNum,
    leader: leaderName ? { full_name: leaderName } : null,
  };
}

// GET all individuals - مع Keyset Pagination + فلاتر - Prisma
export async function GET(request: NextRequest) {
  return requireAuth(async (req, _user) => {
    const t0 = Date.now();
    try {
      const { searchParams } = new URL(req.url);

      // فلاتر
      const q = (searchParams.get('q') || '').trim(); // بحث عام: الاسم/السكن/المركز/الهاتف
      const leaderName = (searchParams.get('leader_name') || '').trim();
      const station = (searchParams.get('station_number') || '').trim();

      // Keyset
      const cursor = searchParams.get('cursor'); // id أقل من هذا
      const pageSizeRaw = Number(searchParams.get('pageSize') || 30);
      const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 100) : 30;

      // فرز
      const sortByParam = (searchParams.get('sortBy') || 'id').trim().toLowerCase();
      const sortDirParam = (searchParams.get('sortDir') || 'desc').trim().toLowerCase();
      const sortBy: 'id' | 'votes_count' = sortByParam === 'votes_count' ? 'votes_count' : 'id';
      const sortDir: 'asc' | 'desc' = sortDirParam === 'asc' ? 'asc' : 'desc';

      // where clause
      const where: any = { };
      if (q) {
        // OR على حقول نصية مدعومة
        where.OR = [
          { full_name: { contains: q } },
          { residence: { contains: q } },
          { center_info: { contains: q } },
          { phone: { contains: q } },
        ];
      }
      if (leaderName) {
        where.leader_name = leaderName;
      }
      if (station) {
        where.station_number = station;
      }
      if (cursor) {
        const cNum = Number(cursor);
        if (Number.isFinite(cNum)) {
          // keyset: إذا كان الفرز by id
          if (sortBy === 'id') {
            // للاتجاه desc نستخدم lt، ولـ asc نستخدم gt
            where.id = sortDir === 'desc' ? { lt: cNum } : { gt: cNum };
          } else {
            // عند الفرز على votes_count لا يمكننا ضمان keyset مستقر بدون tie-break،
            // سنسقط إلى ترقيم الصفحات التقريبي عبر id في where للمحافظة على تناسق نسبي
            // ملاحظة: يمكن لاحقاً اعتماد cursor مركّب (votes_count,id)
            where.id = { lt: cNum };
          }
        }
      }

      const q0 = Date.now();
      
      // جلب إجمالي العدد أولاً
      const totalCount = await db.persons.count({ where });
      
      const personsPlusOne = await db.persons.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }, { id: 'desc' }], // tie-break لضمان ترتيب ثابت
        take: pageSize + 1,
        select: {
          id: true,
          full_name: true,
          leader_name: true,
          residence: true,
          phone: true,
          workplace: true,
          center_info: true,
          station_number: true,
          votes_count: true,
        },
      });
      const q1 = Date.now();

      const hasNext = personsPlusOne.length > pageSize;
      const slice = hasNext ? personsPlusOne.slice(0, pageSize) : personsPlusOne;

      const data: PersonPayload[] = slice.map(mapPerson);

      // احسب nextCursor بناءً على آخر عنصر ظاهر
      const lastVisible = slice[slice.length - 1];
      const nextCursor = hasNext && lastVisible ? String(mapPerson(lastVisible).id) : null;

      const t1 = Date.now();
      const metrics: Metrics = {
        dbQueryMs: q1 - q0,
        serializeMs: t1 - q1,
        totalMs: t1 - t0,
        count: data.length,
      };

      // لوج أداء محسّن مع أرقام واضحة
      console.log(
        '[api/individuals] dbQueryMs=%d serializeMs=%d totalMs=%d count=%d hasNext=%s sortBy=%s sortDir=%s',
        metrics.dbQueryMs,
        metrics.serializeMs,
        metrics.totalMs,
        metrics.count,
        String(hasNext),
        sortBy,
        sortDir
      );

      const responseBody: IndividualsResponse = {
        success: true,
        data,
        page: { hasNext, nextCursor, pageSize },
        total: totalCount,
        meta: { metrics },
      };

      return NextResponse.json(responseBody);
    } catch (error) {
      console.error('Error fetching individuals:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}

// POST create new individual - Prisma
export async function POST(request: NextRequest) {
  return requireAuth(async (req, _user) => {
    try {
      const body = await req.json();
      const {
        leader_name,
        full_name,
        residence,
        phone,
        workplace,
        center_info,
        station_number,
        votes_count,
      } = body || {};

      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
      }

      const votes = Number.isFinite(Number(votes_count)) ? Number(votes_count) : 0;

      // الإنشاء
      const created = await db.persons.create({
        data: {
          leader_name: leader_name ?? null,
          full_name: full_name.trim(),
          residence: residence ?? null,
          phone: phone ?? null,
          workplace: workplace ?? null,
          center_info: center_info ?? null,
          station_number: station_number ?? null,
          votes_count: votes,
          // created_at/updated_at تُدار تلقائياً في الـ DB إن كانت لديك triggers
          // أو يمكن ضبط default في schema. لا حاجة لإرجاعهما الآن.
        },
        select: {
          id: true,
          full_name: true,
          leader_name: true,
          residence: true,
          phone: true,
          workplace: true,
          center_info: true,
          station_number: true,
          votes_count: true,
        },
      });

      const payload: PersonPayload = mapPerson(created);

      return NextResponse.json({
        success: true,
        message: 'Person created successfully',
        data: payload,
      });
    } catch (error) {
      console.error('Error creating individual:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
