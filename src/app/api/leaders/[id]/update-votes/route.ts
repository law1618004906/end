import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { db } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request, user) => {
    try {
      const leaderId = params.id;

      // Get leader with all individuals
      const leader = await db.leaders.findUnique({
        where: { id: leaderId },
        include: {
          individuals: {
            select: {
              votes_count: true,
            },
          },
        },
      });

      if (!leader) {
        return NextResponse.json(
          { error: 'Leader not found' },
          { status: 404 }
        );
      }

      // Calculate total votes from individuals
      const totalIndividualsVotes = leader.individuals.reduce((sum, individual) => sum + individual.votes_count, 0);

      // Update leader's votes count
      const updatedLeader = await db.leaders.update({
        where: { id: leaderId },
        data: {
          votes_count: totalIndividualsVotes,
        },
        include: {
          _count: {
            select: {
              individuals: true,
            },
          },
          individuals: {
            select: {
              votes_count: true,
            },
          },
        },
      });

      // Calculate final totals
      const finalTotalVotes = updatedLeader.individuals.reduce((sum, individual) => sum + individual.votes_count, 0);

      return NextResponse.json({
        success: true,
        message: 'Leader votes updated successfully',
        data: {
          ...updatedLeader,
          totalIndividualsVotes: finalTotalVotes,
        },
      });
    } catch (error) {
      console.error('Error updating leader votes:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}