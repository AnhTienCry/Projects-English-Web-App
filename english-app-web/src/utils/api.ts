import api from '../api/http';
import { API_CONFIG, buildApiUrl } from '../config/api';

// Generic API call function
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      ...options.headers,
    },
    ...options,
  });
};

// Auth functions
export const loginUser = async (email: string, password: string) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password });
  return response.data;
};

export const registerUser = async (email: string, password: string, nickname?: string) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, { email, password, nickname });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.AUTH.ME);
  return response.data;
};

// Data fetching functions
export const fetchUsers = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.USER.LIST);
  return response.data;
};

export const fetchLessons = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.LESSONS.LIST);
  return response.data;
};

export const fetchQuizzes = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.QUIZ.LIST);
  return response.data;
};

export const fetchVideos = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.VIDEO.LIST);
  return response.data;
};

export const fetchRanks = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.RANK.LEADERBOARD);
  return response.data;
};

export const fetchNotifications = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.NOTIFICATION.LIST);
  return response.data;
};

// Auto-login function for demo purposes
export const autoLogin = async (email?: string, password?: string) => {
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Verify token is still valid
      const user = await getCurrentUser();
      return user;
    }
    
    // Try to login with provided credentials or demo credentials
    const loginEmail = email || 'admin@example.com';
    const loginPassword = password || '123123';
    const loginData = await loginUser(loginEmail, loginPassword);
    localStorage.setItem('accessToken', loginData.accessToken);
    localStorage.setItem('refreshToken', loginData.refreshToken);
    return loginData;
  } catch (error) {
    console.error('Auto-login failed:', error);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw error;
  }
};
