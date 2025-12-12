import express from 'express';
import {
  getAllQuizzes,
  getQuizzesByTopic,
  getQuizzesByLesson,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from '../controllers/quizController';
import { authMiddleware, allowTeacherOrAdmin } from '../middleware/auth';

const router = express.Router();

/* ---------- Public / Student ---------- */
// 🔹 Học viên & khách đều có thể xem quiz theo bài hoặc topic
router.get('/', getAllQuizzes);
router.get('/topic/:topicId', getQuizzesByTopic);
router.get('/lesson/:lessonId', getQuizzesByLesson);

/* ---------- Teacher & Admin ---------- */
// 🔹 Tạo quiz (giáo viên hoặc admin)
router.post('/', authMiddleware, allowTeacherOrAdmin, createQuiz);

// 🔹 Cập nhật quiz
router.put('/:id', authMiddleware, allowTeacherOrAdmin, updateQuiz);

// 🔹 Xóa quiz
router.delete('/:id', authMiddleware, allowTeacherOrAdmin, deleteQuiz);

export default router;
