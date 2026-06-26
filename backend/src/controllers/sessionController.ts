import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const updateSessionSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'rescheduled', 'completed', 'cancelled']),
  proposedTime: z.string().datetime().optional(),
});

export const getSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { providerId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        provider: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
        skillOffer: { include: { skill: true } },
        match: true,
      },
      orderBy: { proposedTime: 'asc' },
    });

    return res.status(200).json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params; // session id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = updateSessionSchema.parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Ensure requesting user is either provider or receiver
    if (session.providerId !== userId && session.receiverId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedStatus = data.status;
      let newTime = session.proposedTime;

      if (data.status === 'rescheduled') {
        if (!data.proposedTime) {
          throw new Error('New proposed time is required for rescheduling');
        }
        newTime = new Date(data.proposedTime);
      }

      // If completing, perform Ledger double-entry transfer
      if (data.status === 'completed') {
        if (session.status !== 'accepted' && session.status !== 'completed') {
          throw new Error('Only accepted sessions can be marked as completed');
        }
        
        // If already completed, don't re-transfer credits
        if (session.status !== 'completed') {
          const provider = await tx.user.findUnique({ where: { id: session.providerId } });
          const receiver = await tx.user.findUnique({ where: { id: session.receiverId } });

          if (!provider || !receiver) {
            throw new Error('User not found');
          }

          // Balance protection check: floor of -10.0 hours
          const BALANCE_FLOOR = -10.0;
          if (receiver.timeBalance - session.duration < BALANCE_FLOOR) {
            throw new Error(`Receiver does not have enough time balance (limit: minimum balance is ${BALANCE_FLOOR} hours)`);
          }

          // Perform credit transfer
          await tx.user.update({
            where: { id: receiver.id },
            data: { timeBalance: receiver.timeBalance - session.duration },
          });

          await tx.user.update({
            where: { id: provider.id },
            data: { timeBalance: provider.timeBalance + session.duration },
          });

          // Write Double-Entry Ledger Entry
          await tx.ledgerEntry.create({
            data: {
              sessionId: session.id,
              fromUserId: receiver.id,
              toUserId: provider.id,
              hours: session.duration,
              description: `Barter swap completed: ${session.duration} hours exchanged`,
            },
          });
        }
      }

      // If rejected or cancelled, and it is part of a match, deactivate the match
      if ((data.status === 'rejected' || data.status === 'cancelled') && session.matchId) {
        await tx.match.update({
          where: { id: session.matchId },
          data: { isActive: false },
        });
      }

      // Update the session record
      return await tx.session.update({
        where: { id },
        data: {
          status: updatedStatus,
          proposedTime: newTime,
        },
        include: {
          provider: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
          skillOffer: { include: { skill: true } },
        },
      });
    });

    // Notify other user via Socket.io
    const io = req.app.get('io');
    if (io) {
      const recipientId = session.providerId === userId ? session.receiverId : session.providerId;
      io.to(`user-${recipientId}`).emit('session_updated', {
        sessionId: result.id,
        status: result.status,
        proposedTime: result.proposedTime,
      });
    }

    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Update session error:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
};
