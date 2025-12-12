import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award, 
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Download
} from 'lucide-react';
import { apiCall } from '../../utils/api';

interface ReportStats {
  totalStudents: number;
  activeStudents: number;
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  averageProgress: number;
}

interface StudentProgress {
  _id: string;
  nickname: string;
  email: string;
  completedLessons: number;
  totalPoints: number;
  level: number;
  lastActivity: string;
}

const TeacherReports = () => {
  const [stats, setStats] = useState<ReportStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalLessons: 0,
    completedLessons: 0,
    averageScore: 0,
    averageProgress: 0
  });
  const [topStudents, setTopStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch basic stats
      const [studentsRes, lessonsRes] = await Promise.all([
        apiCall('/api/reports/students').catch(() => null),
        apiCall('/api/lessons').catch(() => null)
      ]);

      // Process students data - backend returns { students: [...] }
      const studentsJson = studentsRes ? await studentsRes.json() : {};
      const studentsData = studentsJson.students || studentsJson || [];
      const lessonsData = lessonsRes ? await lessonsRes.json() : [];

      // Calculate stats
      const totalStudents = Array.isArray(studentsData) ? studentsData.length : 0;
      const activeStudents = Array.isArray(studentsData) 
        ? studentsData.filter((s: any) => s.lastActivity && 
            new Date(s.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length 
        : 0;

      setStats({
        totalStudents,
        activeStudents,
        totalLessons: Array.isArray(lessonsData) ? lessonsData.length : 0,
        completedLessons: Array.isArray(studentsData) 
          ? studentsData.reduce((sum: number, s: any) => sum + (s.completedLessons || 0), 0)
          : 0,
        averageScore: Array.isArray(studentsData) && studentsData.length > 0
          ? Math.round(studentsData.reduce((sum: number, s: any) => sum + (s.averageScore || 0), 0) / studentsData.length)
          : 0,
        averageProgress: totalStudents > 0 && Array.isArray(lessonsData)
          ? Math.round((Array.isArray(studentsData) 
              ? studentsData.reduce((sum: number, s: any) => sum + (s.completedLessons || 0), 0)
              : 0) / (totalStudents * lessonsData.length) * 100)
          : 0
      });

      // Get top students
      if (Array.isArray(studentsData)) {
        const sorted = [...studentsData]
          .sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0))
          .slice(0, 10)
          .map((s: any) => ({
            _id: s._id || s.userId,
            nickname: s.nickname || s.name || 'Student',
            email: s.email || 'N/A',
            completedLessons: s.completedLessons || 0,
            totalPoints: s.totalPoints || s.points || 0,
            level: s.level || 1,
            lastActivity: s.lastActivity || new Date().toISOString()
          }));
        setTopStudents(sorted);
      }

    } catch (err: any) {
      console.error('❌ Error fetching reports:', err);
      setError(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi tải báo cáo</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchReportData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg font-medium"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="text-green-600" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Báo cáo & Phân tích</h1>
                <p className="text-gray-600">Theo dõi tiến độ và hiệu suất học viên</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => alert('Chức năng xuất báo cáo đang được phát triển')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg"
          >
            <Download size={20} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-green-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng học viên</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats.activeStudents} hoạt động trong 7 ngày
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bài học hoàn thành</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedLessons}</p>
              <p className="text-xs text-blue-600 mt-1">
                Trên tổng {stats.totalLessons} bài học
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-4 border-purple-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Điểm TB</p>
              <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
              <p className="text-xs text-purple-600 mt-1">
                Của tất cả học viên
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-4 border-amber-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <TrendingUp className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tiến độ TB</p>
              <p className="text-3xl font-bold text-gray-900">{stats.averageProgress}%</p>
              <p className="text-xs text-amber-600 mt-1">
                Hoàn thành khóa học
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Students */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Award className="text-green-600" size={24} />
            Top học viên xuất sắc
          </h2>
        </div>

        {topStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Học viên
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Điểm
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Bài hoàn thành
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Hoạt động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topStudents.map((student, index) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {index < 3 ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                          }`}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-gray-500 font-medium">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">{student.nickname}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Level {student.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-green-600">{student.totalPoints}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-700 font-medium">{student.completedLessons}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                        <Clock size={14} />
                        {new Date(student.lastActivity).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-gray-500">Chưa có dữ liệu học viên</p>
          </div>
        )}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-green-600" size={20} />
            Biểu đồ tiến độ theo thời gian
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-400">
              <PieChartIcon size={48} className="mx-auto mb-2" />
              <p>Biểu đồ đang được phát triển</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="text-green-600" size={20} />
            Phân bố level học viên
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-400">
              <PieChartIcon size={48} className="mx-auto mb-2" />
              <p>Biểu đồ đang được phát triển</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherReports;



