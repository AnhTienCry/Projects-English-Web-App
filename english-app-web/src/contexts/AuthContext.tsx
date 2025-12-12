import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react'; // ✅ tách riêng import type
import { autoLogin, getCurrentUser } from '../utils/api';


// 🧠 Định nghĩa type user
export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  nickname?: string;
}

// 🧩 Kiểu dữ liệu của AuthContext
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

// ✅ Khởi tạo Context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Hook dùng trong nội bộ (có thể xóa nếu đã tách ra useAuth.ts)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const userData = await getCurrentUser();

        // ❌ Chặn học sinh đăng nhập web
        if (userData.user.role === 'STUDENT') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          return;
        }

        setUser(userData.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('No valid session found');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const loginData = await autoLogin(email, password);

      if (loginData.user.role === 'STUDENT') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error(
          'Students should use the mobile app. Web access is restricted to teachers and administrators.'
        );
      }

      setUser(loginData.user);
      return loginData;
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
