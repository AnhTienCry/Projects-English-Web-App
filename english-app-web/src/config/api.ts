// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
      ME: '/api/protected/me',
    },
    TRANSLATION: {
      EN_TO_VI: '/api/translation/en-to-vi',
      VI_TO_EN: '/api/translation/vi-to-en',
      CUSTOM: '/api/translation/custom',
      LANGUAGES: '/api/translation/languages',
      VOCAB: '/api/translation/vocab',
      HISTORY: '/api/translation/history',
    },
    LESSONS: {
      LIST: '/api/lessons',
      DETAIL: '/api/lessons/:id',
    },
    QUIZ: {
      LIST: '/api/quizzes',
      SUBMIT: '/api/quizzes/submit',
    },
    VIDEO: {
      LIST: '/api/videos',
      DETAIL: '/api/videos/:id',
    },
    USER: {
      LIST: '/api/users',
      CREATE: '/api/users',
      UPDATE: '/api/users/:id',
      DELETE: '/api/users/:id',
    },
    RANK: {
      LEADERBOARD: '/api/ranks/leaderboard',
      PROGRESS: '/api/ranks/progress',
    },
    NOTIFICATION: {
      LIST: '/api/notifications',
      SEND: '/api/notifications/send',
    },
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }
  
  return url;
};

























