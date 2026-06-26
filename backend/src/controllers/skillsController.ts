import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const addOfferSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
  description: z.string().optional(),
  estimatedDuration: z.number().int().min(1, 'Duration must be at least 1 hour').max(10, 'Duration cannot exceed 10 hours').default(1),
});

const addWantSchema = z.object({
  skillId: z.string().uuid('Invalid skill ID'),
  description: z.string().optional(),
});

export const getSkills = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(skills);
  } catch (err) {
    console.error('Get skills error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSkill = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const existingSkill = await prisma.skill.findUnique({
      where: { name },
    });

    if (existingSkill) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    const skill = await prisma.skill.create({
      data: { name, category },
    });

    return res.status(201).json(skill);
  } catch (err) {
    console.error('Create skill error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addOffer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = addOfferSchema.parse(req.body);

    const existingOffer = await prisma.skillOffer.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: data.skillId,
        },
      },
    });

    if (existingOffer) {
      return res.status(400).json({ error: 'You are already offering this skill' });
    }

    const offer = await prisma.skillOffer.create({
      data: {
        userId,
        skillId: data.skillId,
        description: data.description || '',
        estimatedDuration: data.estimatedDuration,
      },
      include: {
        skill: true,
      },
    });

    // Invalidate matches when skills change
    await prisma.match.updateMany({
      where: {
        members: {
          some: {
            providerId: userId,
          },
        },
      },
      data: {
        isActive: false,
      },
    });

    return res.status(201).json(offer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Add offer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOffer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params; // skill_offer id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const offer = await prisma.skillOffer.findUnique({
      where: { id },
    });

    if (!offer || offer.userId !== userId) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    await prisma.skillOffer.delete({
      where: { id },
    });

    // Deactivate associated matches since the skill offer is no longer available
    await prisma.match.updateMany({
      where: {
        members: {
          some: {
            skillOfferId: id,
          },
        },
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('Delete offer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addWant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = addWantSchema.parse(req.body);

    const existingWant = await prisma.skillWant.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: data.skillId,
        },
      },
    });

    if (existingWant) {
      return res.status(400).json({ error: 'You already want this skill' });
    }

    const want = await prisma.skillWant.create({
      data: {
        userId,
        skillId: data.skillId,
        description: data.description || '',
      },
      include: {
        skill: true,
      },
    });

    // Invalidate matches when skills change
    await prisma.match.updateMany({
      where: {
        members: {
          some: {
            receiverId: userId,
          },
        },
      },
      data: {
        isActive: false,
      },
    });

    return res.status(201).json(want);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Add want error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteWant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params; // skill_want id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const want = await prisma.skillWant.findUnique({
      where: { id },
    });

    if (!want || want.userId !== userId) {
      return res.status(404).json({ error: 'Want not found' });
    }

    await prisma.skillWant.delete({
      where: { id },
    });

    // Invalidate matches for this user when wants change
    await prisma.match.updateMany({
      where: {
        members: {
          some: {
            receiverId: userId,
          },
        },
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({ message: 'Want deleted successfully' });
  } catch (err) {
    console.error('Delete want error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
