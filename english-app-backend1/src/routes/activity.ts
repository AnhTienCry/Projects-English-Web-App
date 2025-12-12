import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  logActivity,
  getActivities,
  getActivityStats,
  getUserActivities,
  deleteActivity,
  cleanOldActivities,
  getDashboardStats,
  getRecentActivities
} from '../controllers/activityController';

const router = Router();

// Anyone authenticated can log activities
router.post('/', authenticate, logActivity);

// Teacher/Admin routes
router.get('/', authenticate, requireRole('TEACHER'), getActivities);
router.get('/dashboard-stats', authenticate, requireRole('ADMIN'), getDashboardStats);
router.get('/recent', authenticate, requireRole('ADMIN'), getRecentActivities);
router.get('/stats', authenticate, requireRole('TEACHER'), getActivityStats);
router.get('/user/:userId', authenticate, requireRole('TEACHER'), getUserActivities);

// Admin only
router.delete('/:activityId', authenticate, requireRole('ADMIN'), deleteActivity);
router.delete('/clean', authenticate, requireRole('ADMIN'), cleanOldActivities);

export default router;