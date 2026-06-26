import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPotentialMatchesForUser } from '../services/matching/matchingEngine';

const proposeMatchSchema = z.object({
  type: z.enum(['direct', 'cycle']),
  members: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    providesOfferId: z.string().uuid(),
    providesDuration: z.number().min(1),
  })).min(2),
});

export const getMatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const matches = await getPotentialMatchesForUser(userId);
    return res.status(200).json(matches);
  } catch (err) {
    console.error('Get matches error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const proposeMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = proposeMatchSchema.parse(req.body);

    // Verify the current user is part of the members
    const isMember = data.members.some((m) => m.id === userId);
    if (!isMember) {
      return res.status(400).json({ error: 'You must be a member of the proposed match' });
    }

    // Use a transaction to ensure all db records are created atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Match record
      const match = await tx.match.create({
        data: {
          type: data.type,
          chainLength: data.members.length,
          isActive: true,
        },
      });

      const matchMembersData = [];

      // 2. Create sessions for each swap link in the cycle
      // In a cycle: Member[i] provides service to Member[i+1] (looping back to 0)
      for (let i = 0; i < data.members.length; i++) {
        const provider = data.members[i];
        const receiver = data.members[(i + 1) % data.members.length];

        // Create a scheduled session for this trade link
        const session = await tx.session.create({
          data: {
            matchId: match.id,
            providerId: provider.id,
            receiverId: receiver.id,
            skillOfferId: provider.providesOfferId,
            proposedTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: propose for tomorrow
            duration: provider.providesDuration,
            status: 'proposed',
          },
        });

        matchMembersData.push({
          matchId: match.id,
          sequenceOrder: i,
          providerId: provider.id,
          receiverId: receiver.id,
          skillOfferId: provider.providesOfferId,
          sessionId: session.id,
        });
      }

      // 3. Create all MatchMember records
      await tx.matchMember.createMany({
        data: matchMembersData,
      });

      return match;
    });

    // Fetch the fully populated match details
    const fullMatch = await prisma.match.findUnique({
      where: { id: result.id },
      include: {
        members: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            receiver: { select: { id: true, name: true, email: true } },
            skillOffer: { include: { skill: true } },
            session: true,
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    // Notify other members via socket (we'll integrate socket connection in index.ts)
    const io = req.app.get('io');
    if (io) {
      fullMatch?.members.forEach((member) => {
        // Emit to room for this user
        io.to(`user-${member.providerId}`).emit('match_proposed', {
          matchId: fullMatch.id,
          type: fullMatch.type,
          message: 'A new skill barter loop has been proposed!',
        });
      });
    }

    return res.status(201).json(fullMatch);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Propose match error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getActiveMatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const activeMatches = await prisma.match.findMany({
      where: {
        isActive: true,
        members: {
          some: {
            OR: [
              { providerId: userId },
              { receiverId: userId }
            ]
          }
        }
      },
      include: {
        members: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            receiver: { select: { id: true, name: true, email: true } },
            skillOffer: { include: { skill: true } },
            session: true,
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(activeMatches);
  } catch (err) {
    console.error('Get active matches error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
