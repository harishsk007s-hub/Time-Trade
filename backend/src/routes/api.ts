import { Router } from 'express';
import { register, login, getProfile, updateProfile, getUserProfile } from '../controllers/authController';
import { getSkills, createSkill, addOffer, deleteOffer, addWant, deleteWant } from '../controllers/skillsController';
import { getMatches, proposeMatch, getActiveMatches } from '../controllers/matchingController';
import { getSessions, updateSession } from '../controllers/sessionController';
import { getLedgerEntries } from '../controllers/ledgerController';
import { submitReview, raiseDispute, getDisputes, resolveDispute } from '../controllers/reputationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Authentication & Profile Routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken as any, getProfile as any);
router.put('/auth/profile', authenticateToken as any, updateProfile as any);
router.get('/users/:id', authenticateToken as any, getUserProfile as any);

// Standard Skills & Offers/Wants
router.get('/skills', authenticateToken as any, getSkills as any);
router.post('/skills', authenticateToken as any, createSkill as any);
router.post('/skills/offers', authenticateToken as any, addOffer as any);
router.delete('/skills/offers/:id', authenticateToken as any, deleteOffer as any);
router.post('/skills/wants', authenticateToken as any, addWant as any);
router.delete('/skills/wants/:id', authenticateToken as any, deleteWant as any);

// Matching Engine Routes
router.get('/matches', authenticateToken as any, getMatches as any);
router.post('/matches/propose', authenticateToken as any, proposeMatch as any);
router.get('/matches/active', authenticateToken as any, getActiveMatches as any);

// Session Scheduling Routes
router.get('/sessions', authenticateToken as any, getSessions as any);
router.put('/sessions/:id', authenticateToken as any, updateSession as any);

// Ledger Transaction Log
router.get('/ledger', authenticateToken as any, getLedgerEntries as any);

// Review & Dispute Handlers
router.post('/reviews', authenticateToken as any, submitReview as any);
router.post('/disputes', authenticateToken as any, raiseDispute as any);
router.get('/disputes', authenticateToken as any, getDisputes as any);
router.put('/disputes/:id/resolve', authenticateToken as any, resolveDispute as any);

export default router;
