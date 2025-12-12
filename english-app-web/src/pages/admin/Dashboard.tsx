import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  Brain, 
  Video, 
  TrendingUp, 
  BarChart3,
  Calendar,
  Award,
  FileText,
  Layers
} from 'lucide-react';
import { autoLogin, apiCall } from '../../utils/api';

interface Activity {
  id: string;
  type: 'user' | 'lesson' | 'video' | 'update';
  title: string;
  description: string;
  time: string;
  icon: 'users' | 'book' | 'video' | 'user';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalLessons: 0,
    totalTopics: 0,
    totalQuizzes: 0,
    totalVideos: 0,
    totalStories: 0,
    usersGrowth: 0,
    lessonsGrowth: 0,
    quizzesGrowth: 0,
    videosGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('admin@example.com');
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Attempting auto-login...');
      const user = await autoLogin();
      console.log('✅ Auto-login successful:', user);
      
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Fetch dashboard stats and activities
      const [dashboardStats, activities, topicsRes, storiesRes] = await Promise.all([
        apiCall('/api/activities/dashboard-stats').then(res => res.json()).catch(err => {
          console.warn('Dashboard stats API failed:', err);
          return {
            users: { total: 0, teachers: 0, students: 0, growth: 0 },
            lessons: { total: 0, growth: 0 },
            quizzes: { total: 0, growth: 0 },
            videos: { total: 0, growth: 0 }
          };
        }),
        apiCall('/api/activities/recent?limit=10').then(res => res.json()).catch(err => {
          console.warn('Recent activities API failed:', err);
          return [];
        }),
        apiCall('/api/topics').then(res => res.json()).catch(err => {
          console.warn('Topics API failed:', err);
          return [];
        }),
        apiCall('/api/stories').then(res => res.json()).catch(err => {
          console.warn('Stories API failed:', err);
          return [];
        })
      ]);
      
      console.log('📊 Dashboard stats:', dashboardStats);
      console.log('📜 Recent activities:', activities);

      setStats({
        totalUsers: dashboardStats.users.total,
        totalTeachers: dashboardStats.users.teachers,
        totalStudents: dashboardStats.users.students,
        totalLessons: dashboardStats.lessons.total,
        totalTopics: Array.isArray(topicsRes) ? topicsRes.length : 0,
        totalQuizzes: dashboardStats.quizzes.total,
        totalVideos: dashboardStats.videos.total,
        totalStories: Array.isArray(storiesRes) ? storiesRes.length : 0,
        usersGrowth: dashboardStats.users.growth,
        lessonsGrowth: dashboardStats.lessons.growth,
        quizzesGrowth: dashboardStats.quizzes.growth,
        videosGrowth: dashboardStats.videos.growth
      });

      setRecentActivities(activities);

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Dashboard...</h2>
          <p className="text-gray-500 mt-2">Please wait while we fetch your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {userEmail}</p>
            </div>
            <Link
              to="/admin/reports"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart3 size={20} />
              View Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards - 5 boxes in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Users Card */}
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Total Users</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalUsers}</h3>
                <p className="text-xs text-gray-500">
                  {stats.totalTeachers} Teachers • {stats.totalStudents} Students
                </p>
              </div>
              {stats.usersGrowth !== 0 && (
                <div className={`flex items-center text-xs font-medium ${stats.usersGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp size={14} className="mr-1" />
                  {stats.usersGrowth > 0 ? '+' : ''}{stats.usersGrowth}%
                </div>
              )}
            </div>
          </div>

          {/* Lessons Card */}
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-green-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <BookOpen className="text-green-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Lessons</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalLessons}</h3>
                <p className="text-xs text-gray-500">Active learning content</p>
              </div>
              {stats.lessonsGrowth !== 0 && (
                <div className={`flex items-center text-xs font-medium ${stats.lessonsGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp size={14} className="mr-1" />
                  {stats.lessonsGrowth > 0 ? '+' : ''}{stats.lessonsGrowth}%
                </div>
              )}
            </div>
          </div>

          {/* Topics Card */}
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-indigo-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Layers className="text-indigo-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Topics</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalTopics}</h3>
                <p className="text-xs text-gray-500">Learning topics</p>
              </div>
            </div>
          </div>

          {/* Quizzes Card */}
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-purple-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Brain className="text-purple-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Quizzes</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalQuizzes}</h3>
                <p className="text-xs text-gray-500">Assessment activities</p>
              </div>
              {stats.quizzesGrowth !== 0 && (
                <div className={`flex items-center text-xs font-medium ${stats.quizzesGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp size={14} className="mr-1" />
                  {stats.quizzesGrowth > 0 ? '+' : ''}{stats.quizzesGrowth}%
                </div>
              )}
            </div>
          </div>

          {/* Videos Card */}
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-orange-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Video className="text-orange-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Videos</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalVideos}</h3>
                <p className="text-xs text-gray-500">Learning materials</p>
              </div>
              {stats.videosGrowth !== 0 && (
                <div className={`flex items-center text-xs font-medium ${stats.videosGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp size={14} className="mr-1" />
                  {stats.videosGrowth > 0 ? '+' : ''}{stats.videosGrowth}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stories Card - Separate row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border-t-4 border-teal-500 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-teal-100 p-2 rounded-lg">
                    <FileText className="text-teal-600" size={20} />
                  </div>
                </div>
                <p className="text-gray-600 text-xs font-medium mb-1">Stories</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalStories}</h3>
                <p className="text-xs text-gray-500">Story content</p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Quick Actions đã được ẩn theo yêu cầu */}
        {/* <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Award className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              to="/admin/users"
              className="group bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-blue-600" size={20} />
              </div>
              <h3 className="font-semibold text-blue-900 mb-1">Manage Users</h3>
              <p className="text-sm text-blue-700">Manage and configure</p>
            </Link>

            <Link
              to="/admin/lessons"
              className="group bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="text-green-600" size={20} />
              </div>
              <h3 className="font-semibold text-green-900 mb-1">Manage Lessons</h3>
              <p className="text-sm text-green-700">Manage and configure</p>
            </Link>

            <Link
              to="/admin/topics"
              className="group bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Layers className="text-indigo-600" size={20} />
              </div>
              <h3 className="font-semibold text-indigo-900 mb-1">Manage Topics</h3>
              <p className="text-sm text-indigo-700">Manage and configure</p>
            </Link>

            <Link
              to="/admin/quizzes"
              className="group bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Brain className="text-purple-600" size={20} />
              </div>
              <h3 className="font-semibold text-purple-900 mb-1">Manage Quizzes</h3>
              <p className="text-sm text-purple-700">Manage and configure</p>
            </Link>

            <Link
              to="/admin/videos"
              className="group bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <Video className="text-orange-600" size={20} />
              </div>
              <h3 className="font-semibold text-orange-900 mb-1">Manage Videos</h3>
              <p className="text-sm text-orange-700">Manage and configure</p>
            </Link>

            <Link
              to="/admin/stories"
              className="group bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-6 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-green-600" size={20} />
              </div>
              <h3 className="font-semibold text-green-900 mb-1">Manage Stories</h3>
              <p className="text-sm text-green-700">Manage and configure</p>
            </Link>
          </div>
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Growth Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">User Growth</h2>
            </div>
            <div className="h-64 flex items-center justify-center bg-purple-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="text-purple-400 mx-auto mb-2" size={48} />
                <p className="text-gray-500">Analytics chart would go here</p>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-green-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
            </div>
            <div className="space-y-4">
              {(recentActivities || []).map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.icon === 'users' ? 'bg-blue-100' :
                    activity.icon === 'book' ? 'bg-green-100' :
                    activity.icon === 'video' ? 'bg-orange-100' :
                    'bg-gray-100'
                  }`}>
                    {activity.icon === 'users' && <Users className="text-blue-600" size={20} />}
                    {activity.icon === 'book' && <BookOpen className="text-green-600" size={20} />}
                    {activity.icon === 'video' && <Video className="text-orange-600" size={20} />}
                    {activity.icon === 'user' && <Users className="text-gray-600" size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
              <Link
                to="/admin/activities"
                className="block text-center text-blue-600 hover:text-blue-700 font-medium text-sm pt-4"
              >
                View All Activities →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}