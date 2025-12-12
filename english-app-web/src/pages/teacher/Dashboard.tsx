import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Brain, Video, TrendingUp, Clock, FileText, Layers } from 'lucide-react';
import api from '../../api/http';

interface TeacherStats {
  myStudents: number;
  totalLessons: number;
  totalTopics: number;
  totalQuizzes: number;
  totalVideos: number;
  totalStories: number;
  recentProgress: any[];
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<TeacherStats>({
    myStudents: 0,
    totalLessons: 0,
    totalTopics: 0,
    totalQuizzes: 0,
    totalVideos: 0,
    totalStories: 0,
    recentProgress: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch teacher-specific data
      const [studentsRes, lessonsRes, topicsRes, quizzesRes, videosRes, storiesRes, progressRes] = await Promise.all([
        api.get('/api/reports/teacher/students').catch(() => ({ data: { count: 0 } })),
        api.get('/api/lessons').catch(() => ({ data: [] })),
        api.get('/api/topics').catch(() => ({ data: [] })),
        api.get('/api/quizzes').catch(() => ({ data: [] })),
        api.get('/api/videos').catch(() => ({ data: [] })),
        api.get('/api/stories').catch(() => ({ data: [] })),
        api.get('/api/reports/teacher/progress').catch(() => ({ data: { recent: [] } }))
      ]);

      setStats({
        myStudents: studentsRes.data.count || 0,
        totalLessons: lessonsRes.data.length || 0,
        totalTopics: Array.isArray(topicsRes.data) ? topicsRes.data.length : 0,
        totalQuizzes: quizzesRes.data.length || 0,
        totalVideos: videosRes.data.length || 0,
        totalStories: Array.isArray(storiesRes.data) ? storiesRes.data.length : 0,
        recentProgress: progressRes.data.recent || []
      });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Không thể tải dữ liệu dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Học viên của tôi',
      value: stats.myStudents,
      icon: Users,
      color: 'green',
      link: '/teacher/students'
    },
    {
      title: 'Bài học',
      value: stats.totalLessons,
      icon: BookOpen,
      color: 'purple',
      link: '/teacher/lessons'
    },
    {
      title: 'Chủ đề',
      value: stats.totalTopics,
      icon: Layers,
      color: 'indigo',
      link: '/teacher/topics'
    },
    {
      title: 'Quiz',
      value: stats.totalQuizzes,
      icon: Brain,
      color: 'rose',
      link: '/teacher/quizzes'
    },
    {
      title: 'Video',
      value: stats.totalVideos,
      icon: Video,
      color: 'amber',
      link: '/teacher/videos'
    }
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="text-gray-500">
              Quản lý học viên và nội dung giảng dạy
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - 5 boxes in one row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const borderColorMap: Record<string, string> = {
            green: 'border-green-500',
            purple: 'border-purple-500',
            indigo: 'border-indigo-500',
            rose: 'border-rose-500',
            amber: 'border-amber-500'
          };
          const bgColorMap: Record<string, string> = {
            green: 'bg-green-100',
            purple: 'bg-purple-100',
            indigo: 'bg-indigo-100',
            rose: 'bg-rose-100',
            amber: 'bg-amber-100'
          };
          const textColorMap: Record<string, string> = {
            green: 'text-green-600',
            purple: 'text-purple-600',
            indigo: 'text-indigo-600',
            rose: 'text-rose-600',
            amber: 'text-amber-600'
          };
          return (
            <Link
              key={index}
              to={card.link}
              className={`bg-white rounded-xl shadow-sm border-t-4 ${borderColorMap[card.color]} p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 ${bgColorMap[card.color]} rounded-lg`}>
                  <Icon className={`${textColorMap[card.color]}`} size={20} />
                </div>
              </div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className={`text-2xl font-bold ${textColorMap[card.color]} mb-1`}>{card.value}</p>
              <p className="text-xs text-gray-500">Xem chi tiết</p>
            </Link>
          );
        })}
      </div>

      {/* Stories Card - Separate row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Link
          to="/teacher/stories"
          className="bg-white rounded-xl shadow-sm border-t-4 border-teal-500 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <FileText className="text-teal-600" size={20} />
            </div>
          </div>
          <h3 className="text-xs font-medium text-gray-600 mb-1">Truyện chêm</h3>
          <p className="text-2xl font-bold text-teal-600 mb-1">{stats.totalStories}</p>
          <p className="text-xs text-gray-500">Story content</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-green-600" size={24} />
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link
            to="/teacher/students"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Users className="text-green-600" size={24} />
            <span className="font-medium text-gray-700">Xem học viên</span>
          </Link>
          <Link
            to="/teacher/lessons"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BookOpen className="text-purple-600" size={24} />
            <span className="font-medium text-gray-700">Quản lý bài học</span>
          </Link>
          <Link
            to="/teacher/topics"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Layers className="text-indigo-600" size={24} />
            <span className="font-medium text-gray-700">Quản lý chủ đề</span>
          </Link>
          <Link
            to="/teacher/quiz/import"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Brain className="text-rose-600" size={24} />
            <span className="font-medium text-gray-700">Import quiz</span>
          </Link>
          <Link
            to="/teacher/vocab/import"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Video className="text-amber-600" size={24} />
            <span className="font-medium text-gray-700">Import vocab</span>
          </Link>
          <Link
            to="/teacher/stories"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText className="text-green-600" size={24} />
            <span className="font-medium text-gray-700">Quản lý Truyện chêm</span>
          </Link>
        </div>
      </div>

      {/* Recent Student Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="text-green-600" size={24} />
          Tiến độ học viên gần đây
        </h2>
        {stats.recentProgress.length > 0 ? (
          <div className="space-y-4">
            {stats.recentProgress.map((progress, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {progress.studentName || 'Học viên'} - {progress.activity || 'Hoàn thành bài học'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress.timestamp || 'Vừa xong'}
                  </p>
                </div>
                <div className="text-sm font-bold text-green-600">
                  +{progress.points || 0} điểm
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📈</div>
            <p className="text-gray-500">Chưa có tiến độ học tập nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
























