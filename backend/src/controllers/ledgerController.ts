import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const getLedgerEntries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Find all ledger entries involving the user
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        session: {
          include: {
            skillOffer: {
              include: { skill: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(entries);
  } catch (err) {
    console.error('Get ledger entries error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
