import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import prisma from '../../../lib/db';

type RowLeader = {
  id: number;
  full_name: string;
  residence: string | null;
  phone: string | null;
  workplace: string | null;
  center_info: string | null;
  station_number: string | null;
  votes_count: number;
  created_at: string;
  updated_at: string;
};

type RowPersonAgg = {
  cnt: number;
  sum_votes: number | null;
};

type PersonPreviewRow = {
  full_name: string;
};

interface LeaderWithCount {
  id: number;
  full_name: string;
  residence?: string | null;
  phone?: string | null;
  workplace?: string | null;
  center_info?: string | null;
  station_number?: string | null;
  votes_count: number;
  created_at: string;
  updated_at: string;
  _count: {
    individuals: number;
  };
  totalIndividualsVotes?: number;
}

// محول عميق: BigInt -> Number
function toPlainNumber(value: unknown): any {
  if (typeof value === 'bigint') {
    // ملاحظة: نفترض الأرقام ضمن النطاق الآمن
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => toPlainNumber(v));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlainNumber(v);
    }
    return out;
  }
  return value;
}

// GET all leaders
export async function GET(request: NextRequest) {
  return requireAuth(async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const search = (searchParams.get('search') || '').trim();

      const leaders = await prisma.leaders.findMany({
        orderBy: { id: 'desc' },
      });
      const leaderNames = leaders.map((l) => l.full_name);
      
      // بعد جلب القادة احسب الت.population واستطّعها قبل بناء الـ payload
      const aggregates = await prisma.persons.groupBy({
        by: ['leader_name'],
        where: {
          leader_name: {
            in: leaders.map((l) => l.full_name),
          },
        },
        _count: { _all: true },
        _sum: { votes_count: true },
      });
      const aggregatesNormalized = aggregates.map((a) => ({
        leader_name: a.leader_name,
        cnt: a._count?._all ?? 0,
        sum_votes: a._sum?.votes_count ?? 0,
      }));

      // individualsPreview: نستعلم أول 5 أفراد لكل قائد (id DESC) باستعلامات صغيرة منفصلة
      const previewsByLeader: Record<string, any[]> = {};
      for (const leader of leaders) {
        const personsPreview = await prisma.persons.findMany({
          where: { leader_name: leader.full_name },
          select: {
            leader_name: true,
            full_name: true,
            residence: true,
            phone: true,
            workplace: true,
            center_info: true,
            station_number: true,
            votes_count: true,
          },
          orderBy: { id: 'desc' },
          take: 5,
        });
        previewsByLeader[leader.full_name] = personsPreview;
      }
      // individualsPreview السابق كان يجلب full_name فقط لكل قائد بحد 5
      // سنقوم الآن بجلب جميع الحقول الثمانية للأفراد لكل قائد بحد 5 وبترتيب الأحدث
      // when building the response, instead of individualsPreview: string[] im using the full arrays
      const payload = leaders.map((l) => {
        const agg = aggregatesNormalized.find((a) => a.leader_name === l.full_name);
        return {
          id: l.id,
          full_name: l.full_name,
          residence: l.residence,
          phone: l.phone,
          workplace: l.workplace,
          center_info: l.center_info,
          station_number: l.station_number,
          votes_count: Number(l.votes_count ?? 0),
          counts: Number(agg?.cnt ?? 0),
          sum_votes: Number(agg?.sum_votes ?? 0),
          individualsPreview: (previewsByLeader[l.full_name] ?? []).map((p) => ({
            leader_name: p.leader_name,
            full_name: p.full_name,
            residence: p.residence ?? 'لايوجد',
            phone: p.phone ?? 'لايوجد',
            workplace: p.workplace ?? 'لايوجد',
            center_info: p.center_info ?? 'لايوجد',
            station_number: p.station_number ?? 'لايوجد',
            votes_count: Number(p.votes_count ?? 0),
          })),
        };
      });

      const plain = toPlainNumber(payload);
      if (process.env.NODE_ENV !== 'production') {
        try {
          JSON.stringify(plain);
          // eslint-disable-next-line no-console
          console.log('[api/leaders] result serialized successfully (BigInt->Number)');
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[api/leaders] serialization check failed:', e);
        }
      }
      return NextResponse.json({ success: true, data: plain });
    } catch (error) {
      console.error('Error fetching leaders:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}

// POST create new leader
export async function POST(request: NextRequest) {
  return requireAuth(async (request, user) => {
    try {
      const body = await request.json();
      const {
        full_name,
        residence,
        phone,
        workplace,
        center_info,
        station_number,
      } = body;

      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return NextResponse.json(
          { error: 'full_name is required' },
          { status: 400 }
        );
      }

      // تحقق عدم تكرار الاسم
      const exists = await prisma.$queryRawUnsafe<{ c: number }[]>(
        `SELECT COUNT(*) as c FROM leaders WHERE full_name = ?`,
        full_name.trim()
      );
      if ((exists[0]?.c ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Leader with this name already exists' },
          { status: 400 }
        );
      }

      // إنشاء القائد
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO leaders (full_name, residence, phone, workplace, center_info, station_number, votes_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        full_name.trim(),
        residence ?? null,
        phone ?? null,
        workplace ?? null,
        center_info ?? null,
        station_number ?? null
      );

      // جلب السجل المُنشأ للتو
      const created = await prisma.$queryRawUnsafe<RowLeader[]>(
        `
        SELECT id, full_name, residence, phone, workplace, center_info, station_number, votes_count, created_at, updated_at
        FROM leaders
        WHERE full_name = ?
        ORDER BY id DESC
        LIMIT 1
      `,
        full_name.trim()
      );
      const newLeader = created[0];

      const agg = await prisma.$queryRawUnsafe<RowPersonAgg[]>(
        `
        SELECT COUNT(*) as cnt, COALESCE(SUM(votes_count), 0) as sum_votes
        FROM persons
        WHERE leader_name = ?
      `,
        newLeader.full_name
      );
      const individuals = agg[0]?.cnt ?? 0;
      const sumVotes = agg[0]?.sum_votes ?? 0;

      const payload: LeaderWithCount = {
        ...newLeader,
        _count: { individuals },
        totalIndividualsVotes: sumVotes,
      };

      return NextResponse.json({
        success: true,
        message: 'Leader created successfully',
        data: payload,
      });
    } catch (error) {
      console.error('Error creating leader:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
