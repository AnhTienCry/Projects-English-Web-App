import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen,
  Layers,
  Video, 
  Brain,
  BookMarked,
  FileText,
  TrendingUp,
  LogOut,
  ChevronRight,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/teacher/dashboard' },
    { label: 'Students', icon: Users, to: '/teacher/students' },
    { label: 'Lessons', icon: BookOpen, to: '/teacher/lessons' },
    { label: 'Topics', icon: Layers, to: '/teacher/topics' },
    { label: 'Vocabularies', icon: BookMarked, to: '/teacher/vocabularies' },
    { label: 'Quizzes', icon: Brain, to: '/teacher/quizzes' },
    { label: 'Quiz Rank', icon: Trophy, to: '/teacher/quiz-rank' },
    { label: 'Videos', icon: Video, to: '/teacher/videos' },
    { label: 'Stories', icon: FileText, to: '/teacher/stories' },
    { label: 'Practice', icon: Brain, to: '/teacher/practice' },
    { label: 'Reports', icon: TrendingUp, to: '/teacher/reports' },
  ];

  const isActive = (path: string) => {
    if (path === '/teacher/dashboard') {
      return pathname === '/teacher' || pathname === '/teacher/' || pathname === '/teacher/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-2xl h-screen sticky top-0">
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">English App</h1>
              <p className="text-xs text-slate-400">Teacher Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu - Scrollable */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30' 
                    : 'hover:bg-slate-700/50'
                  }
                `}
                style={{ textDecoration: 'none' }}
              >
                <Icon 
                  size={20} 
                  className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} 
                  style={{ flexShrink: 0 }}
                />
                <span 
                  className="flex-1 font-medium text-sm" 
                  style={{ color: active ? '#ffffff' : '#cbd5e1' }}
                >
                  {item.label}
                </span>
                {active && <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User Info Footer - Fixed at bottom */}
        <div className="border-t border-slate-700/50 bg-slate-900/50 flex-shrink-0">
          <div className="p-4">
            {/* User Profile */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">
                  {user?.nickname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'T'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                  Teacher
                </div>
                <div className="text-sm text-white font-medium truncate">
                  {user?.nickname || user?.email?.split('@')[0] || 'Teacher'}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}