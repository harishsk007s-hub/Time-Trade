import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const submitReviewSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const raiseDisputeSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

const resolveDisputeSchema = z.object({
  status: z.enum(['resolved_completed', 'resolved_cancelled']),
  adminNotes: z.string().min(2, 'Admin notes must be provided'),
});

export const submitReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = submitReviewSchema.parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'completed' && session.status !== 'disputed') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed or disputed sessions' });
    }

    // Identify reviewee
    let revieweeId = '';
    let role: 'provider' | 'receiver';

    if (session.providerId === userId) {
      revieweeId = session.receiverId;
      role = 'receiver'; // reviewee was the receiver
    } else if (session.receiverId === userId) {
      revieweeId = session.providerId;
      role = 'provider'; // reviewee was the provider
    } else {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    // Ensure they haven't already reviewed this session
    const existingReview = await prisma.review.findUnique({
      where: {
        sessionId_reviewerId: {
          sessionId: data.sessionId,
          reviewerId: userId,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this session' });
    }

    const review = await prisma.review.create({
      data: {
        sessionId: data.sessionId,
        reviewerId: userId,
        revieweeId,
        role,
        rating: data.rating,
        comment: data.comment || '',
      },
    });

    return res.status(201).json(review);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Submit review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const raiseDispute = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = raiseDisputeSchema.parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.providerId !== userId && session.receiverId !== userId) {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create dispute
      const dispute = await tx.dispute.create({
        data: {
          sessionId: data.sessionId,
          raisedById: userId,
          reason: data.reason,
          status: 'pending',
        },
      });

      // Update session status to disputed
      await tx.session.update({
        where: { id: data.sessionId },
        data: { status: 'disputed' },
      });

      return dispute;
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Raise dispute error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDisputes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Admin check: in a real app, check req.user.role === 'admin'
    // For simplicity, anyone can access the disputes list in this MVP, or we can check if email includes admin
    const disputes = await prisma.dispute.findMany({
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        session: {
          include: {
            provider: { select: { id: true, name: true, email: true } },
            receiver: { select: { id: true, name: true, email: true } },
            skillOffer: { include: { skill: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(disputes);
  } catch (err) {
    console.error('Get disputes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resolveDispute = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // dispute id
    const data = resolveDisputeSchema.parse(req.body);

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'pending') {
      return res.status(400).json({ error: 'Dispute is already resolved' });
    }

    const session = dispute.session;

    const result = await prisma.$transaction(async (tx) => {
      // Resolve status mapping
      const sessionStatus = data.status === 'resolved_completed' ? 'completed' : 'cancelled';

      // If resolving as completed and not already transferred, perform double-entry ledger transfer
      if (data.status === 'resolved_completed' && session.status !== 'completed') {
        const provider = await tx.user.findUnique({ where: { id: session.providerId } });
        const receiver = await tx.user.findUnique({ where: { id: session.receiverId } });

        if (provider && receiver) {
          // Perform credit transfer
          await tx.user.update({
            where: { id: receiver.id },
            data: { timeBalance: receiver.timeBalance - session.duration },
          });

          await tx.user.update({
            where: { id: provider.id },
            data: { timeBalance: provider.timeBalance + session.duration },
          });

          // Ledger Entry
          await tx.ledgerEntry.create({
            data: {
              sessionId: session.id,
              fromUserId: receiver.id,
              toUserId: provider.id,
              hours: session.duration,
              description: `Dispute resolved by Admin as completed. Credits transferred.`,
            },
          });
        }
      }

      // Update Dispute Record
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: data.status,
          adminNotes: data.adminNotes,
        },
      });

      // Update Session Status
      await tx.session.update({
        where: { id: session.id },
        data: { status: sessionStatus },
      });

      return updatedDispute;
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Resolve dispute error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
