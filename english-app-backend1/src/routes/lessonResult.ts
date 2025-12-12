import express from 'express';
import {
  submitLessonResult,
  getLessonResults,
  getMyLessonResult,
  getUserLessonResults
} from '../controllers/lessonResultController';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// Submit lesson result (student only)
router.post('/:lessonId/result', authenticate, submitLessonResult);

// Get all results for a lesson (teacher/admin)
router.get('/:lessonId/results', authenticate, requireRole('TEACHER'), getLessonResults);

// Get my result for a lesson (student)
router.get('/:lessonId/results/me', authenticate, getMyLessonResult);

// Get user's lesson results (teacher/admin)
router.get('/results/user/:userId', authenticate, requireRole('TEACHER'), getUserLessonResults);

export default router;










