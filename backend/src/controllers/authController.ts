import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-timetrade-key-2026';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  bio: z.string().optional(),
  location: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  availability: z.any().optional(),
});

// Helper to generate JWT
const generateToken = (userId: string, email: string) => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        bio: data.bio || '',
        location: data.location || '',
        availability: '{}',
        timeBalance: 5.0, // Give 5 bonus hours to start trading
      },
    });

    const token = generateToken(user.id, user.email);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        availability: user.availability ? JSON.parse(user.availability) : {},
        timeBalance: user.timeBalance,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        availability: user.availability ? JSON.parse(user.availability) : {},
        timeBalance: user.timeBalance,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skillOffers: {
          include: { skill: true }
        },
        skillWants: {
          include: { skill: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      location: user.location,
      availability: user.availability ? JSON.parse(user.availability) : {},
      timeBalance: user.timeBalance,
      skillOffers: user.skillOffers,
      skillWants: user.skillWants,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        location: data.location,
        availability: data.availability ? JSON.stringify(data.availability) : undefined,
      },
      include: {
        skillOffers: {
          include: { skill: true }
        },
        skillWants: {
          include: { skill: true }
        }
      }
    });

    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      location: updatedUser.location,
      availability: updatedUser.availability ? JSON.parse(updatedUser.availability) : {},
      timeBalance: updatedUser.timeBalance,
      skillOffers: updatedUser.skillOffers,
      skillWants: updatedUser.skillWants,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        skillOffers: {
          include: { skill: true }
        },
        skillWants: {
          include: { skill: true }
        },
        reviewsReceived: {
          include: {
            reviewer: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate rating
    const totalReviews = user.reviewsReceived.length;
    const avgRating = totalReviews > 0
      ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / totalReviews
      : 5.0;

    // Badge: Verified Trader after 3+ completed swaps as provider
    const completedSwapsAsProvider = user.reviewsReceived.filter(r => r.role === 'provider').length;
    const isVerified = completedSwapsAsProvider >= 3;

    return res.status(200).json({
      id: user.id,
      name: user.name,
      bio: user.bio,
      location: user.location,
      availability: user.availability ? JSON.parse(user.availability) : {},
      timeBalance: user.timeBalance,
      skillOffers: user.skillOffers,
      skillWants: user.skillWants,
      reviews: user.reviewsReceived,
      rating: Math.round(avgRating * 10) / 10,
      isVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
