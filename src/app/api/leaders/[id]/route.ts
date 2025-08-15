import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/middleware';
import prisma from '../../../../lib/db';

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

// PUT update leader
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (request, user) => {
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid leader ID' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const {
        full_name,
        residence,
        phone,
        workplace,
        center_info,
        station_number,
        votes_count,
      } = body;

      if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
        return NextResponse.json(
          { error: 'full_name is required' },
          { status: 400 }
        );
      }

      // تحقق وجود القائد
      const existing = await prisma.$queryRawUnsafe<RowLeader[]>(
        `SELECT * FROM leaders WHERE id = ?`,
        id
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Leader not found' },
          { status: 404 }
        );
      }

      // تحقق عدم تكرار الاسم (إلا إذا كان نفس القائد)
      const nameExists = await prisma.$queryRawUnsafe<{ c: number }[]>(
        `SELECT COUNT(*) as c FROM leaders WHERE full_name = ? AND id != ?`,
        full_name.trim(),
        id
      );
      if ((nameExists[0]?.c ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Leader with this name already exists' },
          { status: 400 }
        );
      }

      // تحديث القائد
      await prisma.$executeRawUnsafe(
        `
        UPDATE leaders 
        SET full_name = ?, residence = ?, phone = ?, workplace = ?, 
            center_info = ?, station_number = ?, votes_count = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        full_name.trim(),
        residence ?? null,
        phone ?? null,
        workplace ?? null,
        center_info ?? null,
        station_number ?? null,
        votes_count ?? 0,
        id
      );

      // إذا تم تغيير اسم القائد، يجب تحديث الأفراد المرتبطين
      const oldName = existing[0].full_name;
      if (oldName !== full_name.trim()) {
        await prisma.$executeRawUnsafe(
          `UPDATE persons SET leader_name = ? WHERE leader_name = ?`,
          full_name.trim(),
          oldName
        );
      }

      // جلب البيانات المحدثة
      const updated = await prisma.$queryRawUnsafe<RowLeader[]>(
        `SELECT * FROM leaders WHERE id = ?`,
        id
      );
      const updatedLeader = updated[0];

      // جلب إحصائيات الأفراد
      const agg = await prisma.$queryRawUnsafe<RowPersonAgg[]>(
        `
        SELECT COUNT(*) as cnt, COALESCE(SUM(votes_count), 0) as sum_votes
        FROM persons
        WHERE leader_name = ?
      `,
        updatedLeader.full_name
      );
      const individuals = agg[0]?.cnt ?? 0;
      const sumVotes = agg[0]?.sum_votes ?? 0;

      const payload: LeaderWithCount = {
        ...updatedLeader,
        _count: { individuals },
        totalIndividualsVotes: sumVotes,
      };

      return NextResponse.json({
        success: true,
        message: 'Leader updated successfully',
        data: payload,
      });
    } catch (error) {
      console.error('Error updating leader:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}

// DELETE leader
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (request, user) => {
    try {
      const id = parseInt(params.id);
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid leader ID' },
          { status: 400 }
        );
      }

      // تحقق وجود القائد
      const existing = await prisma.$queryRawUnsafe<RowLeader[]>(
        `SELECT * FROM leaders WHERE id = ?`,
        id
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Leader not found' },
          { status: 404 }
        );
      }

      const leaderName = existing[0].full_name;

      // تحقق من وجود أفراد مرتبطين
      const associatedPersons = await prisma.$queryRawUnsafe<{ c: number }[]>(
        `SELECT COUNT(*) as c FROM persons WHERE leader_name = ?`,
        leaderName
      );

      if ((associatedPersons[0]?.c ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete leader with associated individuals. Please reassign or delete the individuals first.' },
          { status: 400 }
        );
      }

      // حذف القائد
      await prisma.$executeRawUnsafe(
        `DELETE FROM leaders WHERE id = ?`,
        id
      );

      return NextResponse.json({
        success: true,
        message: 'Leader deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting leader:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
