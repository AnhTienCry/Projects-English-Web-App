import express from 'express';
import {
  submitQuizResult,
  getQuizResults,
  getMyQuizResult,
  getUserQuizResults,
  getTopicQuizAnalytics
} from '../controllers/quizResultController';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// Submit quiz result (student only)
router.post('/:quizId/result', authenticate, submitQuizResult);

// Get all results for a quiz (teacher/admin)
router.get('/:quizId/results', authenticate, requireRole('TEACHER'), getQuizResults);

// Get my result for a quiz (student)
router.get('/:quizId/results/me', authenticate, getMyQuizResult);

// Get user's quiz results (teacher/admin)
router.get('/results/user/:userId', authenticate, requireRole('TEACHER'), getUserQuizResults);

// Get topic quiz analytics (teacher/admin)
router.get('/analytics/topic/:topicId', authenticate, requireRole('TEACHER'), getTopicQuizAnalytics);

export default router;










