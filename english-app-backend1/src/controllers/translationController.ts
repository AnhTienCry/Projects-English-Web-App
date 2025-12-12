import { Request, Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';
import Translation from '../models/Translation';
import TranslationHistory from '../models/TranslationHistory';

// LibreTranslate API configuration
const LIBRETRANSLATE_API_URL = process.env.LIBRETRANSLATE_API_URL || 'https://libretranslate.com/translate';
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || '';

// Fallback: Sử dụng MyMemory API
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

// Language code mapping for LibreTranslate
const LANGUAGE_CODE_MAP: { [key: string]: string } = {
  'en': 'en',
  'vi': 'vi', 
  'ja': 'ja',
  'ko': 'ko',
  'zh': 'zh',
  'fr': 'fr',
  'de': 'de',
  'es': 'es',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
  'ar': 'ar',
  'th': 'th',
  'hi': 'hi'
};

/**
 * 💾 Lưu lịch sử dịch thuật (cũ - giữ để tương thích)
 */
async function saveTranslationHistory(
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  userId?: string,
  isVocab: boolean = false,
  wordId?: string
) {
  try {
    await Translation.create({
      userId: userId ? userId as any : undefined,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      isVocab,
      wordId: wordId ? wordId as any : undefined
    });
  } catch (err) {
    console.error('Error saving translation history:', err);
    // Don't throw error, just log it
  }
}

/**
 * 💾 Lưu lịch sử dịch thuật mới
 */
async function saveNewTranslationHistory(
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  translationType: 'contextual' | 'manual' | 'vocab',
  userId?: string,
  context?: string,
  wordId?: string,
  lessonId?: string,
  confidence?: number
) {
  try {
    await TranslationHistory.create({
      userId,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      translationType,
      context,
      wordId,
      lessonId,
      confidence,
      isVocab: translationType === 'vocab'
    });
  } catch (err) {
    console.error('Error saving new translation history:', err);
    // Don't throw error, just log it
  }
}

/**
 * 🔄 Fallback translation using MyMemory API
 */
async function translateWithMyMemory(text: string, source: string, target: string): Promise<string> {
  try {
    const response = await axios.get(MYMEMORY_API_URL, {
      params: {
        q: text,
        langpair: `${source}|${target}`
      }
    });
    
    if (response.data.responseStatus === 200 && response.data.responseData) {
      return response.data.responseData.translatedText;
    }
    
    throw new Error('MyMemory API failed');
  } catch (err) {
    console.error('MyMemory API error:', err);
    throw err;
  }
}

/**
 * 🌐 Dịch văn bản từ tiếng Anh sang tiếng Việt
 */
export async function translateEnToVi(req: Request, res: Response) {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: { message: 'Text is required and must be a string' } 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: { message: 'Text is too long. Maximum 5000 characters.' } 
      });
    }

    let translatedText: string;
    
    try {
      // Thử LibreTranslate trước
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: text,
        source: 'en',
        target: 'vi',
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });
      translatedText = response.data.translatedText;
    } catch (libreError) {
      console.warn('LibreTranslate failed, trying MyMemory fallback...');
      // Fallback to MyMemory API
      translatedText = await translateWithMyMemory(text, 'en', 'vi');
    }

    // Lưu lịch sử dịch thuật (không cần userId cho public API)
    await saveTranslationHistory(text, translatedText, 'en', 'vi');

    return res.json({
      originalText: text,
      translatedText,
      sourceLanguage: 'en',
      targetLanguage: 'vi',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateEnToVi error:', err);
    
    if (axios.isAxiosError(err)) {
      console.error('LibreTranslate API Error:', err.response?.data);
      if (err.response?.status === 429) {
        return res.status(429).json({ 
          error: { message: 'Translation service rate limit exceeded. Please try again later.' } 
        });
      }
      if (err.response?.status === 400) {
        return res.status(400).json({ 
          error: { message: `Translation service error: ${err.response?.data?.error || 'Invalid text for translation'}` } 
        });
      }
    }

    return res.status(500).json({ 
      error: { message: 'Translation service unavailable' } 
    });
  }
}

/**
 * 🌐 Dịch văn bản từ tiếng Việt sang tiếng Anh
 */
export async function translateViToEn(req: Request, res: Response) {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: { message: 'Text is required and must be a string' } 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: { message: 'Text is too long. Maximum 5000 characters.' } 
      });
    }

    let translatedText: string;
    
    try {
      // Thử LibreTranslate trước
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: text,
        source: 'vi',
        target: 'en',
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });
      translatedText = response.data.translatedText;
    } catch (libreError) {
      console.warn('LibreTranslate failed, trying MyMemory fallback...');
      // Fallback to MyMemory API
      translatedText = await translateWithMyMemory(text, 'vi', 'en');
    }

    // Lưu lịch sử dịch thuật
    await saveTranslationHistory(text, translatedText, 'vi', 'en');

    return res.json({
      originalText: text,
      translatedText,
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateViToEn error:', err);
    
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 429) {
        return res.status(429).json({ 
          error: { message: 'Translation service rate limit exceeded. Please try again later.' } 
        });
      }
      if (err.response?.status === 400) {
        return res.status(400).json({ 
          error: { message: 'Invalid text for translation' } 
        });
      }
    }

    return res.status(500).json({ 
      error: { message: 'Translation service unavailable' } 
    });
  }
}

/**
 * 🌐 Dịch văn bản với ngôn ngữ tùy chỉnh
 */
export async function translateCustom(req: Request, res: Response) {
  try {
    const { text, source, target } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: { message: 'Text is required and must be a string' } 
      });
    }

    if (!source || !target) {
      return res.status(400).json({ 
        error: { message: 'Source and target languages are required' } 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: { message: 'Text is too long. Maximum 5000 characters.' } 
      });
    }

    // Map language codes
    const sourceLang = LANGUAGE_CODE_MAP[source] || source;
    const targetLang = LANGUAGE_CODE_MAP[target] || target;

    let translatedText = '';

    try {
      // Try LibreTranslate first
      console.log(`🌐 Trying LibreTranslate: ${sourceLang} -> ${targetLang}`);
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });

      translatedText = response.data.translatedText;
      console.log('✅ LibreTranslate success:', translatedText);

    } catch (libreError) {
      console.log('❌ LibreTranslate failed, trying MyMemory fallback...');
      
      try {
        // Fallback to MyMemory API
        const myMemoryResponse = await axios.get(MYMEMORY_API_URL, {
          params: {
            q: text,
            langpair: `${sourceLang}|${targetLang}`
          }
        });

        translatedText = myMemoryResponse.data.responseData.translatedText;
        console.log('✅ MyMemory success:', translatedText);

      } catch (myMemoryError) {
        console.error('❌ Both translation services failed');
        throw new Error('All translation services unavailable');
      }
    }

    return res.json({
      originalText: text,
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateCustom error:', err);
    
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 429) {
        return res.status(429).json({ 
          error: { message: 'Translation service rate limit exceeded. Please try again later.' } 
        });
      }
      if (err.response?.status === 400) {
        return res.status(400).json({ 
          error: { message: 'Invalid text or language codes for translation' } 
        });
      }
    }

    return res.status(500).json({ 
      error: { message: 'Translation service unavailable' } 
    });
  }
}

/**
 * 🌐 Lấy danh sách ngôn ngữ được hỗ trợ
 */
export async function getSupportedLanguages(req: Request, res: Response) {
  try {
    const response = await axios.get(`${LIBRETRANSLATE_API_URL.replace('/translate', '/languages')}`);
    
    return res.json({
      languages: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('getSupportedLanguages error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to fetch supported languages' } 
    });
  }
}

/**
 * 🌐 Dịch từ vựng trong bài học (tích hợp với hệ thống hiện tại)
 */
export async function translateVocab(req: AuthRequest, res: Response) {
  try {
    const { word, source = 'en', target = 'vi', wordId } = req.body;
    const userId = req.user?.sub;
    
    if (!word) {
      return res.status(400).json({ 
        error: { message: 'Word is required' } 
      });
    }

    let translatedWord: string;
    
    try {
      // Thử LibreTranslate trước
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: word,
        source,
        target,
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });
      translatedWord = response.data.translatedText;
    } catch (libreError) {
      console.warn('LibreTranslate failed for vocab, trying MyMemory fallback...');
      // Fallback to MyMemory API
      translatedWord = await translateWithMyMemory(word, source, target);
    }

    // Lưu lịch sử dịch thuật với thông tin user
    await saveTranslationHistory(
      word, 
      translatedWord, 
      source, 
      target, 
      userId, 
      true, 
      wordId
    );

    return res.json({
      originalWord: word,
      translatedWord,
      sourceLanguage: source,
      targetLanguage: target,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateVocab error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to translate vocabulary' } 
    });
  }
}

/**
 * 📚 Lấy lịch sử dịch thuật của user
 */
export async function getTranslationHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { page = 1, limit = 20, source, target } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        error: { message: 'Unauthorized' } 
      });
    }

    const filter: any = { userId };
    
    if (source) filter.sourceLanguage = source;
    if (target) filter.targetLanguage = target;

    const translations = await Translation.find(filter)
      .populate('wordId', 'word meaning')
      .sort({ timestamp: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await Translation.countDocuments(filter);

    return res.json({
      translations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (err) {
    console.error('getTranslationHistory error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to fetch translation history' } 
    });
  }
}

/**
 * 🌐 Dịch theo ngữ cảnh (contextual translation)
 */
export async function translateContextual(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { word, context, source = 'en', target = 'vi', lessonId } = req.body;

    if (!word) {
      return res.status(400).json({ 
        error: { message: 'Word is required' } 
      });
    }

    let translatedWord: string;
    let confidence = 0.8; // Default confidence for contextual translation
    
    try {
      // Thử LibreTranslate trước
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: word,
        source,
        target,
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });
      translatedWord = response.data.translatedText;
    } catch (libreError) {
      console.warn('LibreTranslate failed for contextual translation, trying MyMemory fallback...');
      // Fallback to MyMemory API
      translatedWord = await translateWithMyMemory(word, source, target);
      confidence = 0.6; // Lower confidence for fallback
    }

    // Lưu lịch sử dịch thuật
    await saveNewTranslationHistory(
      word, 
      translatedWord, 
      source, 
      target, 
      'contextual',
      userId,
      context,
      undefined,
      lessonId,
      confidence
    );

    return res.json({
      originalWord: word,
      translatedWord,
      sourceLanguage: source,
      targetLanguage: target,
      context,
      confidence,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateContextual error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to translate word contextually' } 
    });
  }
}

/**
 * 🌐 Dịch thủ công (manual translation)
 */
export async function translateManual(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { text, source, target, lessonId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: { message: 'Text is required and must be a string' } 
      });
    }

    if (!source || !target) {
      return res.status(400).json({ 
        error: { message: 'Source and target languages are required' } 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: { message: 'Text is too long. Maximum 5000 characters.' } 
      });
    }

    let translatedText: string;
    let confidence = 0.9; // High confidence for manual translation
    
    try {
      // Thử LibreTranslate trước
      const response = await axios.post(LIBRETRANSLATE_API_URL, {
        q: text,
        source,
        target,
        format: 'text',
        api_key: LIBRETRANSLATE_API_KEY
      });
      translatedText = response.data.translatedText;
    } catch (libreError) {
      console.warn('LibreTranslate failed for manual translation, trying MyMemory fallback...');
      // Fallback to MyMemory API
      translatedText = await translateWithMyMemory(text, source, target);
      confidence = 0.7; // Lower confidence for fallback
    }

    // Lưu lịch sử dịch thuật
    await saveNewTranslationHistory(
      text, 
      translatedText, 
      source, 
      target, 
      'manual',
      userId,
      undefined,
      undefined,
      lessonId,
      confidence
    );

    return res.json({
      originalText: text,
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
      confidence,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('translateManual error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to translate text manually' } 
    });
  }
}

/**
 * 📚 Lấy lịch sử dịch thuật mới của user
 */
export async function getNewTranslationHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { page = 1, limit = 20, type, lessonId } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        error: { message: 'Unauthorized' } 
      });
    }

    const filter: any = { userId };
    
    if (type) filter.translationType = type;
    if (lessonId) filter.lessonId = lessonId;

    const translations = await TranslationHistory.find(filter)
      .populate('wordId', 'word meaning')
      .populate('lessonId', 'title level')
      .sort({ timestamp: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await TranslationHistory.countDocuments(filter);

    return res.json({
      translations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (err) {
    console.error('getNewTranslationHistory error:', err);
    return res.status(500).json({ 
      error: { message: 'Failed to fetch translation history' } 
    });
  }
}
