import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/middleware';
import { db } from '@/lib/db';

// Generate campaign summary report
export async function POST(request: NextRequest) {
  return requireAuth(async (request, user) => {
    if (!requirePermission('reports.create')(request, user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      const body = await request.json();
      const { campaignId, period } = body;

      // Get campaign data
      const campaign = await db.campaign.findUnique({
        where: { id: campaignId },
        include: {
          _count: {
            select: {
              posts: true,
              tasks: true,
              marketers: true,
              areas: true,
              joinRequests: true,
            },
          },
        },
      });

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      // Get posts statistics
      const postsStats = await db.post.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: {
          status: true,
        },
      });

      // Get tasks statistics
      const tasksStats = await db.task.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: {
          status: true,
        },
      });

      // Get join requests statistics
      const joinRequestsStats = await db.joinRequest.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: {
          status: true,
        },
      });

      // Get user activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivities = await db.activityLog.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const reportData = {
        campaign: {
          id: campaign.id,
          title: campaign.titleAr,
          status: campaign.status,
          budget: campaign.budget,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        },
        statistics: {
          posts: {
            total: campaign._count.posts,
            byStatus: postsStats,
          },
          tasks: {
            total: campaign._count.tasks,
            byStatus: tasksStats,
          },
          marketers: campaign._count.marketers,
          areas: campaign._count.areas,
          joinRequests: {
            total: campaign._count.joinRequests,
            byStatus: joinRequestsStats,
          },
        },
        recentActivities: recentActivities.slice(0, 20),
        generatedAt: new Date().toISOString(),
        period,
      };

      // Save report to database
      const report = await db.report.create({
        data: {
          title: `Campaign Summary - ${campaign.titleAr}`,
          titleAr: `تقرير ملخص الحملة - ${campaign.titleAr}`,
          type: 'CAMPAIGN_SUMMARY',
          campaignId,
          data: JSON.stringify(reportData),
          period,
        },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'GENERATE_REPORT',
          entityType: 'Report',
          entityId: report.id,
          newValues: JSON.stringify({
            type: 'CAMPAIGN_SUMMARY',
            campaignId,
            period,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          report,
          reportData,
        },
      });
    } catch (error) {
      console.error('Generate report error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

// Get all reports
export async function GET(request: NextRequest) {
  return requireAuth(async (request, user) => {
    if (!requirePermission('reports.read')(request, user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const type = searchParams.get('type');
      const campaignId = searchParams.get('campaignId');

      const skip = (page - 1) * limit;

      const where: any = {};
      if (type) where.type = type;
      if (campaignId) where.campaignId = campaignId;

      const [reports, total] = await Promise.all([
        db.report.findMany({
          where,
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                titleAr: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { generatedAt: 'desc' },
        }),
        db.report.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get reports error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}