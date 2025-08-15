import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

// بنية العقدة الشجرية المحسنة
type TreeNode = {
  id: string;
  label: string;
  type: 'leader' | 'person';
  votes?: number;
  details?: {
    residence?: string;
    phone?: string;
    workplace?: string;
    center_info?: string;
    station_number?: string;
    created_at?: string;
    updated_at?: string;
  };
  children?: TreeNode[];
  totalVotes?: number; // مجموع أصوات القائد + أفراده
};

export async function GET(request: NextRequest) {
  return requireAuth(async (_req, _user) => {
    try {
      // اجلب جميع القادة مع كل المعلومات
      const leaders = await db.$queryRawUnsafe<Array<{
        id: number;
        full_name: string;
        votes_count: number;
        residence: string | null;
        phone: string | null;
        workplace: string | null;
        center_info: string | null;
        station_number: string | null;
        created_at: string;
        updated_at: string;
      }>>(
        `
        SELECT id, full_name, votes_count, residence, phone, workplace, 
               center_info, station_number, created_at, updated_at
        FROM leaders
        ORDER BY id DESC
        `
      );

      // لكل قائد اجلب الأفراد المرتبطين باسمه مع كل معلوماتهم
      const tree: TreeNode[] = [];
      for (const l of leaders) {
        const persons = await db.$queryRawUnsafe<Array<{
          id: number;
          full_name: string;
          votes_count: number;
          residence: string | null;
          phone: string | null;
          workplace: string | null;
          center_info: string | null;
          station_number: string | null;
          created_at: string;
          updated_at: string;
        }>>(
          `
          SELECT id, full_name, votes_count, residence, phone, workplace,
                 center_info, station_number, created_at, updated_at
          FROM persons
          WHERE leader_name = ?
          ORDER BY id DESC
          `,
          l.full_name
        );

        const children: TreeNode[] = persons.map(p => ({
          id: String(p.id),
          label: p.full_name,
          type: 'person',
          votes: p.votes_count ?? 0,
          details: {
            residence: p.residence || undefined,
            phone: p.phone || undefined,
            workplace: p.workplace || undefined,
            center_info: p.center_info || undefined,
            station_number: p.station_number || undefined,
            created_at: p.created_at,
            updated_at: p.updated_at,
          },
        }));

        // حساب المجموع الكلي للأصوات
        const individualsVotes = persons.reduce((sum, p) => sum + (p.votes_count ?? 0), 0);
        const totalVotes = (l.votes_count ?? 0) + individualsVotes;

        tree.push({
          id: String(l.id),
          label: l.full_name,
          type: 'leader',
          votes: l.votes_count ?? 0,
          totalVotes,
          details: {
            residence: l.residence || undefined,
            phone: l.phone || undefined,
            workplace: l.workplace || undefined,
            center_info: l.center_info || undefined,
            station_number: l.station_number || undefined,
            created_at: l.created_at,
            updated_at: l.updated_at,
          },
          children,
        });
      }

      return NextResponse.json(tree);
    } catch (error) {
      console.error('Error fetching leaders tree:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
