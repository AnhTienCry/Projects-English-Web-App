import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import type { AuthContextType } from '../../contexts/AuthContext';

// ✅ Hook truy cập context an toàn
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('⚠️ useAuth must be used inside <AuthProvider>');
  }
  return context;
};
