import http from './http';

export interface TranslationRequest {
  text: string;
  source?: string;
  target?: string;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: string;
}

export interface TranslationHistory {
  translations: TranslationResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

export class TranslationAPI {
  /**
   * Dịch từ tiếng Anh sang tiếng Việt
   */
  static async translateEnToVi(text: string): Promise<TranslationResponse> {
    const response = await http.post('/api/translation/en-to-vi', { text });
    return response.data;
  }

  /**
   * Dịch từ tiếng Việt sang tiếng Anh
   */
  static async translateViToEn(text: string): Promise<TranslationResponse> {
    const response = await http.post('/api/translation/vi-to-en', { text });
    return response.data;
  }

  /**
   * Dịch tùy chỉnh
   */
  static async translateCustom(
    text: string,
    source: string,
    target: string
  ): Promise<TranslationResponse> {
    const response = await http.post('/api/translation/custom', {
      text,
      source,
      target,
    });
    return response.data;
  }

  /**
   * Lấy danh sách ngôn ngữ hỗ trợ
   */
  static async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const response = await http.get('/api/translation/languages');
    return response.data.languages || [];
  }

  /**
   * Dịch từ vựng (yêu cầu authentication)
   */
  static async translateVocab(
    word: string,
    source: string = 'en',
    target: string = 'vi',
    wordId?: string
  ): Promise<TranslationResponse> {
    const response = await http.post('/api/translation/vocab', {
      word,
      source,
      target,
      wordId,
    });
    return response.data;
  }

  /**
   * Lấy lịch sử dịch thuật
   */
  static async getTranslationHistory(params?: {
    page?: number;
    limit?: number;
    source?: string;
    target?: string;
  }): Promise<TranslationHistory> {
    const response = await http.get('/api/translation/history', { params });
    return response.data;
  }
}
