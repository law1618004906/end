import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lines = parseInt(searchParams.get('lines') || '100');
    const type = searchParams.get('type') || 'recent'; // recent, stats

    if (type === 'stats') {
      const stats = logger.getLogStats();
      return NextResponse.json(stats);
    }

    if (type === 'recent') {
      const recentLogs = logger.getRecentLogs(lines);
      return NextResponse.json({
        logs: recentLogs,
        count: recentLogs.length,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    logger.error('Failed to retrieve logs', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // تنظيف الـ logs القديمة
    logger.cleanOldLogs();
    logger.info('Manual log cleanup triggered via API');
    
    return NextResponse.json({ 
      message: 'Log cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to clean logs via API', error);
    return NextResponse.json(
      { error: 'Failed to clean logs' },
      { status: 500 }
    );
  }
}
