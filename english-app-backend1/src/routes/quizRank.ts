import express from 'express';
import {
  getAllQuizRankLessons,
  getQuizRankLessonById,
  createQuizRankLesson,
  updateQuizRankLesson,
  deleteQuizRankLesson,
  getQuizRank,
  updateQuizRank,
} from '../controllers/quizRankController';
import { authMiddleware, optionalAuthMiddleware, allowTeacherOrAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes (for backward compatibility)
router.get('/', getQuizRank);
router.put('/', authMiddleware, updateQuizRank);

// Quiz Rank Lessons CRUD
// GET endpoints are public (with optional auth for progress)
// POST/PUT/DELETE require authentication
router.get('/lessons', optionalAuthMiddleware, getAllQuizRankLessons);
router.get('/lessons/:id', optionalAuthMiddleware, getQuizRankLessonById);
router.post('/lessons', authMiddleware, allowTeacherOrAdmin, createQuizRankLesson);
router.put('/lessons/:id', authMiddleware, allowTeacherOrAdmin, updateQuizRankLesson);
router.delete('/lessons/:id', authMiddleware, allowTeacherOrAdmin, deleteQuizRankLesson);

export default router;




