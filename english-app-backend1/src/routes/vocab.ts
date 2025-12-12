import express from 'express';
import {
  getAllVocabs,
  getVocabsByLesson,
  getVocabsByTopic,
  getVocabById,
  createVocab,
  updateVocab,
  deleteVocab,
  bulkImportVocabs
} from '../controllers/vocabController';
import { authMiddleware, allowTeacherOrAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * Public/Student routes
 */
router.get('/', authMiddleware, getAllVocabs);
router.get('/lesson/:lessonId', authMiddleware, getVocabsByLesson);
router.get('/topic/:topicId', authMiddleware, getVocabsByTopic);
router.get('/:id', authMiddleware, getVocabById);

/**
 * Teacher/Admin routes
 */
router.post('/', authMiddleware, allowTeacherOrAdmin, createVocab);
router.post('/bulk-import', authMiddleware, allowTeacherOrAdmin, bulkImportVocabs);
router.put('/:id', authMiddleware, allowTeacherOrAdmin, updateVocab);
router.delete('/:id', authMiddleware, allowTeacherOrAdmin, deleteVocab);

export default router;