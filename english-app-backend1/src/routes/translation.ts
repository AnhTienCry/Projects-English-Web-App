import { Router } from 'express';
import { 
  translateEnToVi, 
  translateViToEn, 
  translateCustom, 
  getSupportedLanguages,
  translateVocab,
  getTranslationHistory,
  translateContextual,
  translateManual,
  getNewTranslationHistory
} from '../controllers/translationController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * 🌐 Dịch từ tiếng Anh sang tiếng Việt
 * POST /api/translation/en-to-vi
 * Body: { text: string }
 */
router.post('/en-to-vi', translateEnToVi);

/**
 * 🌐 Dịch từ tiếng Việt sang tiếng Anh
 * POST /api/translation/vi-to-en
 * Body: { text: string }
 */
router.post('/vi-to-en', translateViToEn);

/**
 * 🌐 Dịch với ngôn ngữ tùy chỉnh
 * POST /api/translation/custom
 * Body: { text: string, source: string, target: string }
 */
router.post('/custom', translateCustom);

/**
 * 🌐 Lấy danh sách ngôn ngữ được hỗ trợ
 * GET /api/translation/languages
 */
router.get('/languages', getSupportedLanguages);

/**
 * 🌐 Dịch từ vựng (yêu cầu authentication)
 * POST /api/translation/vocab
 * Body: { word: string, source?: string, target?: string, wordId?: string }
 */
router.post('/vocab', authenticate, translateVocab);

/**
 * 📚 Lấy lịch sử dịch thuật của user
 * GET /api/translation/history?page=1&limit=20&source=en&target=vi
 */
router.get('/history', authenticate, getTranslationHistory);

// ===== NEW TRANSLATION SYSTEM =====

/**
 * 🎯 Dịch theo ngữ cảnh (contextual translation)
 * POST /api/translation/contextual
 * Body: { word: string, context?: string, source?: string, target?: string, lessonId?: string }
 */
router.post('/contextual', authenticate, translateContextual);

/**
 * 🔧 Dịch thủ công (manual translation)
 * POST /api/translation/manual
 * Body: { text: string, source: string, target: string, lessonId?: string }
 */
router.post('/manual', authenticate, translateManual);

/**
 * 📚 Lấy lịch sử dịch thuật mới của user
 * GET /api/translation/history/new?page=1&limit=20&type=contextual&lessonId=xxx
 */
router.get('/history/new', authenticate, getNewTranslationHistory);

export default router;
