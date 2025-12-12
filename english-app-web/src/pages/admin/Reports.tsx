import React, { useState, useEffect } from 'react';
import { 
  BarChart3,
  Users,
  BookOpen,
  TrendingUp,
  Download,
  Calendar,
  Award,
  Target,
  Brain,
  Video,
  BookMarked,
  Clock,
  Activity,
  AlertCircle,
  Eye
} from 'lucide-react';
import api from '../../api/http';
import { autoLogin } from '../../utils/api';

interface DetailedReportData {
  overview: {
    totalLessons: number;
    totalQuizzes: number;
    totalVocabs: number;
    totalVideos: number;
    publishedLessons: number;
    publishedPercentage: number;
  };
  users: {
    total: number;
    active: number;
    byRole: {
      admins: number;
      teachers: number;
      students: number;
    };
    growthRate: number;
    newUsersThisWeek: number;
  };
  engagement: {
    totalLessonResults: number;
    totalQuizResults: number;
    averageLessonScore: number;
    averageQuizScore: number;
    totalActivities: number;
    avgActivitiesPerUser: number;
  };
  performance: {
    topPerformers: any[];
    lessonCompletionRate: number;
    quizPassRate: number;
    avgTimePerLesson: number;
  };
  lessonsByLevel: { [key: string]: number };
}

const AdminReports: React.FC = () => {
  const [reportData, setReportData] = useState<DetailedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchDetailedReport();
  }, [dateRange]);

  const fetchDetailedReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Auto-login to ensure we have valid token
      console.log('🔐 Attempting auto-login for Reports...');
      await autoLogin();
      console.log('✅ Auto-login successful for Reports');
      
      const [
        lessonsRes,
        quizzesRes,
        vocabsRes,
        videosRes,
        usersRes,
        leaderboardRes,
        _dashboardStatsRes,
        recentActivitiesRes
      ] = await Promise.all([
        api.get('/api/lessons').then(res => res.data).catch(() => []),
        api.get('/api/quiz').then(res => res.data).catch(() => []),
        api.get('/api/vocab').then(res => res.data).catch(() => []),
        api.get('/api/videos').then(res => res.data).catch(() => []),
        api.get('/api/users').then(res => res.data).catch(() => ({ users: [] })),
        api.get('/api/progression/leaderboard?limit=10').then(res => res.data).catch(() => []),
        api.get('/api/activities/dashboard-stats').then(res => res.data).catch(() => ({})),
        api.get('/api/activities/recent?limit=100').then(res => res.data).catch(() => [])
      ]);

      const users = usersRes.users || [];
      const lessons = Array.isArray(lessonsRes) ? lessonsRes : [];
      const quizzes = Array.isArray(quizzesRes) ? quizzesRes : [];
      const vocabs = Array.isArray(vocabsRes) ? vocabsRes : [];
      const videos = Array.isArray(videosRes) ? videosRes : [];
      const activities = Array.isArray(recentActivitiesRes) ? recentActivitiesRes : [];

      // Calculate published lessons
      const publishedLessons = lessons.filter((l: any) => l.isPublished).length;
      const publishedPercentage = lessons.length > 0 
        ? Math.round((publishedLessons / lessons.length) * 100) 
        : 0;

      // User analytics
      const activeUsers = users.filter((user: any) => {
        const lastActive = new Date(user.lastActiveDate || user.createdAt);
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= parseInt(dateRange);
      }).length;

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const newUsersThisWeek = users.filter((u: any) => new Date(u.createdAt) > oneWeekAgo).length;
      const growthRate = users.length > 0 ? Math.round((newUsersThisWeek / users.length) * 100) : 0;

      // Engagement analytics from activities
      const lessonActivities = activities.filter((a: any) => a.type === 'lesson_completed');
      const quizActivities = activities.filter((a: any) => a.type === 'quiz_completed');
      
      const avgLessonScore = lessonActivities.length > 0
        ? Math.round(lessonActivities.reduce((sum: number, a: any) => sum + (a.metadata?.score || 0), 0) / lessonActivities.length)
        : 0;

      const avgQuizScore = quizActivities.length > 0
        ? Math.round(quizActivities.reduce((sum: number, a: any) => sum + (a.metadata?.score || 0), 0) / quizActivities.length)
        : 0;

      const avgActivitiesPerUser = users.length > 0 
        ? Math.round(activities.length / users.length) 
        : 0;

      // Performance metrics
      const lessonCompletionRate = lessons.length > 0 && users.length > 0
        ? Math.round((lessonActivities.length / (lessons.length * users.length)) * 100)
        : 0;

      const passedQuizzes = quizActivities.filter((a: any) => (a.metadata?.score || 0) >= 70).length;
      const quizPassRate = quizActivities.length > 0
        ? Math.round((passedQuizzes / quizActivities.length) * 100)
        : 0;

      const avgTimePerLesson = lessonActivities.length > 0
        ? Math.round(lessonActivities.reduce((sum: number, a: any) => sum + (a.metadata?.duration || 0), 0) / lessonActivities.length)
        : 0;

      // Lessons by level
      const lessonsByLevel = lessons.reduce((acc: any, lesson: any) => {
        const level = lesson.level || 'N/A';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});

      setReportData({
        overview: {
          totalLessons: lessons.length,
          totalQuizzes: quizzes.length,
          totalVocabs: vocabs.length,
          totalVideos: videos.length,
          publishedLessons,
          publishedPercentage
        },
        users: {
          total: users.length,
          active: activeUsers,
          byRole: {
            admins: users.filter((u: any) => u.role === 'ADMIN').length,
            teachers: users.filter((u: any) => u.role === 'TEACHER').length,
            students: users.filter((u: any) => u.role === 'STUDENT').length,
          },
          growthRate,
          newUsersThisWeek
        },
        engagement: {
          totalLessonResults: lessonActivities.length,
          totalQuizResults: quizActivities.length,
          averageLessonScore: avgLessonScore,
          averageQuizScore: avgQuizScore,
          totalActivities: activities.length,
          avgActivitiesPerUser
        },
        performance: {
          topPerformers: Array.isArray(leaderboardRes) ? leaderboardRes : [],
          lessonCompletionRate,
          quizPassRate,
          avgTimePerLesson
        },
        lessonsByLevel
      });
    } catch (err: any) {
      console.error('❌ Error fetching detailed report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent = [
      ['Category', 'Metric', 'Value'],
      ['Overview', 'Total Lessons', reportData.overview.totalLessons],
      ['Overview', 'Published Lessons', reportData.overview.publishedLessons],
      ['Overview', 'Total Quizzes', reportData.overview.totalQuizzes],
      ['Overview', 'Total Vocabularies', reportData.overview.totalVocabs],
      ['Overview', 'Total Videos', reportData.overview.totalVideos],
      ['Users', 'Total Users', reportData.users.total],
      ['Users', 'Active Users', reportData.users.active],
      ['Users', 'Students', reportData.users.byRole.students],
      ['Users', 'Teachers', reportData.users.byRole.teachers],
      ['Users', 'Admins', reportData.users.byRole.admins],
      ['Users', 'New Users This Week', reportData.users.newUsersThisWeek],
      ['Engagement', 'Total Lesson Results', reportData.engagement.totalLessonResults],
      ['Engagement', 'Total Quiz Results', reportData.engagement.totalQuizResults],
      ['Engagement', 'Average Lesson Score', reportData.engagement.averageLessonScore],
      ['Engagement', 'Average Quiz Score', reportData.engagement.averageQuizScore],
      ['Engagement', 'Total Activities', reportData.engagement.totalActivities],
      ['Performance', 'Lesson Completion Rate', reportData.performance.lessonCompletionRate + '%'],
      ['Performance', 'Quiz Pass Rate', reportData.performance.quizPassRate + '%'],
      ['Performance', 'Average Time Per Lesson', reportData.performance.avgTimePerLesson + ' minutes'],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải báo cáo chi tiết...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi tải báo cáo</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchDetailedReport}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <p className="text-gray-500">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Báo cáo & Phân tích Admin</h1>
                  <p className="text-purple-100 mt-1">Tổng quan toàn diện về nền tảng học tiếng Anh</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-20 text-white focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                <option value="7" className="text-gray-900">7 ngày qua</option>
                <option value="30" className="text-gray-900">30 ngày qua</option>
                <option value="90" className="text-gray-900">90 ngày qua</option>
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white text-purple-700 px-6 py-2 rounded-lg transition-colors font-semibold hover:bg-purple-50"
              >
                <Download size={20} />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Content Overview - 5 cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="text-purple-600" size={28} />
            Tổng quan nội dung
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BookOpen className="text-blue-600" size={20} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Bài học</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalLessons}</p>
              <p className="text-xs text-green-600 mt-1">
                {reportData.overview.publishedLessons} đã xuất bản ({reportData.overview.publishedPercentage}%)
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-purple-500 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Brain className="text-purple-600" size={20} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Quizzes</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalQuizzes}</p>
              <p className="text-xs text-gray-500 mt-1">Câu hỏi kiểm tra</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 p-2 rounded-lg">
                  <BookMarked className="text-green-600" size={20} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Từ vựng</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalVocabs}</p>
              <p className="text-xs text-gray-500 mt-1">Từ đã thêm</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Video className="text-red-600" size={20} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Videos</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalVideos}</p>
              <p className="text-xs text-gray-500 mt-1">Video học tập</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Activity className="text-amber-600" size={20} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Hoạt động</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{reportData.engagement.totalActivities}</p>
              <p className="text-xs text-gray-500 mt-1">
                TB: {reportData.engagement.avgActivitiesPerUser}/user
              </p>
            </div>
          </div>
        </div>

        {/* User Analytics - 4 cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="text-indigo-600" size={28} />
            Phân tích người dùng
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border-t-4 border-indigo-500 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <Users className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Tổng người dùng</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.users.total}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="text-green-600" size={16} />
                <span className="text-green-600 font-semibold">+{reportData.users.newUsersThisWeek}</span>
                <span className="text-gray-500">tuần này ({reportData.users.growthRate}%)</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-t-4 border-green-500 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Activity className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Người dùng hoạt động</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.users.active}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {reportData.users.total > 0 
                  ? Math.round((reportData.users.active / reportData.users.total) * 100)
                  : 0}% tổng người dùng
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-500 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Học viên</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.users.byRole.students}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {reportData.users.total > 0 
                  ? Math.round((reportData.users.byRole.students / reportData.users.total) * 100)
                  : 0}% người dùng
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-t-4 border-purple-500 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Award className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Giảng viên</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.users.byRole.teachers}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {reportData.users.byRole.admins} quản trị viên
              </div>
            </div>
          </div>
        </div>

        {/* Engagement & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Engagement Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="text-green-600" size={24} />
              Mức độ tương tác
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kết quả bài học</span>
                  <span className="text-xl font-bold text-blue-700">{reportData.engagement.totalLessonResults}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Điểm TB:</span>
                  <span className="font-semibold text-blue-600">{reportData.engagement.averageLessonScore}%</span>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kết quả quiz</span>
                  <span className="text-xl font-bold text-purple-700">{reportData.engagement.totalQuizResults}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Điểm TB:</span>
                  <span className="font-semibold text-purple-600">{reportData.engagement.averageQuizScore}%</span>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Hoạt động trung bình/user</span>
                  <span className="text-xl font-bold text-green-700">{reportData.engagement.avgActivitiesPerUser}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Tổng {reportData.engagement.totalActivities} hoạt động
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={24} />
              Hiệu suất học tập
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Tỷ lệ hoàn thành bài học</span>
                  <span className="text-lg font-bold text-gray-900">{reportData.performance.lessonCompletionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${reportData.performance.lessonCompletionRate}%` }}
                  >
                    {reportData.performance.lessonCompletionRate > 10 && (
                      <span className="text-xs font-semibold text-white">{reportData.performance.lessonCompletionRate}%</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Tỷ lệ đỗ quiz (≥70%)</span>
                  <span className="text-lg font-bold text-gray-900">{reportData.performance.quizPassRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${reportData.performance.quizPassRate}%` }}
                  >
                    {reportData.performance.quizPassRate > 10 && (
                      <span className="text-xs font-semibold text-white">{reportData.performance.quizPassRate}%</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Thời gian TB/bài học</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.performance.avgTimePerLesson} phút</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lessons by Level */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="text-blue-600" size={24} />
              Phân bố bài học theo cấp độ
            </h3>
            {Object.keys(reportData.lessonsByLevel).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(reportData.lessonsByLevel)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([level, count]) => (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Level {level}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {count as number} bài ({Math.round((count as number / reportData.overview.totalLessons) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                          style={{ width: `${(count as number / reportData.overview.totalLessons) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Chưa có dữ liệu</p>
            )}
          </div>

          {/* User Role Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="text-purple-600" size={24} />
              Phân bố vai trò người dùng
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Học viên (Students)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {reportData.users.byRole.students} ({Math.round((reportData.users.byRole.students / reportData.users.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                    style={{ width: `${(reportData.users.byRole.students / reportData.users.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Giảng viên (Teachers)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {reportData.users.byRole.teachers} ({Math.round((reportData.users.byRole.teachers / reportData.users.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                    style={{ width: `${(reportData.users.byRole.teachers / reportData.users.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Quản trị viên (Admins)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {reportData.users.byRole.admins} ({Math.round((reportData.users.byRole.admins / reportData.users.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full"
                    style={{ width: `${(reportData.users.byRole.admins / reportData.users.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="text-yellow-600" size={24} />
            Bảng xếp hạng học viên xuất sắc
          </h3>
          {reportData.performance.topPerformers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Hạng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Điểm số
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Streak
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.performance.topPerformers.map((user: any, index: number) => (
                    <tr key={user._id || index} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white' :
                          'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {user.userId?.nickname || user.userId?.email || 'Anonymous'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-100 text-blue-800">
                          Level {user.currentLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="text-green-600" size={16} />
                          <span className="text-lg font-bold text-green-600">{user.totalScore}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="text-orange-600" size={16} />
                          <span className="text-lg font-bold text-orange-600">{user.streak}</span>
                          <span className="text-xs text-gray-500">ngày</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Award size={48} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có dữ liệu học viên</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
