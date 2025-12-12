import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../../api/http';
import { API_CONFIG } from '../../config/api';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  nickname?: string;
}

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get(API_CONFIG.ENDPOINTS.AUTH.ME);
      setUser(data.user);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isTeacher = user.role === 'TEACHER';
 // const isStudent = user.role === 'STUDENT';

  const getNavItems = () => {
    if (isAdmin) {
      return [
        { path: '/admin', label: 'Dashboard', icon: '📊' },
        { path: '/admin/users', label: 'Quản lý người dùng', icon: '👥' },
        { path: '/admin/lessons', label: 'Quản lý bài học', icon: '📚' },
        { path: '/admin/videos', label: 'Quản lý video', icon: '🎥' },
        { path: '/admin/reports', label: 'Báo cáo', icon: '📈' },
      ];
    } else if (isTeacher) {
      return [
        { path: '/teacher', label: 'Dashboard', icon: '📊' },
        { path: '/teacher/students', label: 'Học viên của tôi', icon: '📱' },
        { path: '/teacher/lessons', label: 'Bài học', icon: '📚' },
        { path: '/teacher/videos', label: 'Video', icon: '🎥' },
        { path: '/teacher/progress', label: 'Tiến độ học tập', icon: '📈' },
      ];
    } else {
      return [
        { path: '/', label: 'Trang chủ', icon: '🏠' },
        { path: '/profile', label: 'Hồ sơ', icon: '👤' },
        { path: '/progress', label: 'Tiến độ', icon: '📈' },
        { path: '/quiz', label: 'Quiz', icon: '🧠' },
        { path: '/videos', label: 'Video', icon: '🎥' },
        { path: '/translation', label: 'Dịch thuật', icon: '🌐' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 transition-all duration-300 fixed h-full z-50`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 text-center">
          <h2 className={`text-white font-bold ${sidebarOpen ? 'text-xl' : 'text-lg'} transition-all duration-300`}>
            {sidebarOpen ? '📚 English App' : '📚'}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">
            {isAdmin ? 'Admin' : isTeacher ? 'Giảng viên' : 'Học viên'}
          </div>
          <div className="text-sm font-bold text-white mb-2 truncate">
            {user.nickname || user.email}
          </div>
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded transition-colors duration-200"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <span className="text-xl">☰</span>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Xin chào, {user.nickname || user.email}</span>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                isAdmin ? 'bg-red-500' : isTeacher ? 'bg-blue-500' : 'bg-green-500'
              }`}
            >
              {user.nickname ? user.nickname[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
