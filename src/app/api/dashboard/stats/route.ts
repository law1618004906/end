import { NextResponse } from "next/server";
// استخدم نفس عميل Prisma المشترك في المشروع
import db from "@/lib/db";
import { cache } from "@/lib/cache";

// محول عميق لتحويل BigInt إلى Number قبل الإرجاع (نفس النهج المستخدم سابقاً)
function toPlainNumber(value: unknown): any {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(toPlainNumber);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlainNumber(v);
    }
    return out;
  }
  return value;
}

export async function GET() {
  const cacheKey = 'dashboard-stats';
  
  // التحقق من وجود البيانات في الكاش
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('[/api/dashboard/stats] returning cached data');
    return NextResponse.json(cachedData, { status: 200 });
  }

  try {
    // COUNT(*) من leaders
    const totalLeaders = await db.leaders.count();

    // COUNT(*) من persons
    const totalPersons = await db.persons.count();

    // SUM(votes_count) من persons مع COALESCE=0
    const sumAgg = await db.persons.aggregate({
      _sum: { votes_count: true },
    });
    const totalVotesRaw = sumAgg._sum.votes_count ?? 0;

    // NEW: توزيع الأفراد حسب القادة عبر الاسم النصّي leader_name
    // 1) تجميع الأشخاص حسب leader_name
    const personsGroupedByLeaderName = await db.persons.groupBy({
      by: ["leader_name"],
      _count: { _all: true },
    });

    // 2) اجلب جميع القادة لبناء خريطة اسم القائد الحقيقي
    const leadersList = await db.leaders.findMany({
      select: { id: true, full_name: true },
    });

    const nameToLeader = new Map<string, { id: number; full_name: string }>();
    for (const l of leadersList) {
      if (l.full_name) nameToLeader.set(l.full_name, { id: l.id, full_name: l.full_name });
    }

    // 3) شكّل leadersDistribution
    const leadersDistribution = personsGroupedByLeaderName.map((g: any) => {
      const key = typeof g.leader_name === "string" ? g.leader_name : "";
      const matched = key ? nameToLeader.get(key) : undefined;
      return {
        leaderId: matched?.id ?? null,
        leaderName: matched?.full_name ?? (key?.trim() || "غير معلوم"),
        count: g._count?._all ?? 0,
      };
    });

    const payload = {
      totalLeaders,
      totalPersons,
      totalVotes: totalVotesRaw,
      leadersDistribution,
    };

    const result = toPlainNumber(payload);
    
    // حفظ في الكاش لمدة 2 دقيقة
    cache.set(cacheKey, result, 2 * 60 * 1000);

    if (process.env.NODE_ENV !== "production") {
      console.log("[/api/dashboard/stats] payload:", payload);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[/api/dashboard/stats] error:", err);
    return NextResponse.json(
      { error: "Failed to compute dashboard stats" },
      { status: 500 }
    );
  }
}
