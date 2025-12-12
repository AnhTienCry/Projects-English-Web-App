import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Mail, Award, TrendingUp, BookOpen, ArrowLeft } from 'lucide-react';

interface StudentData {
  _id?: string;
  userId?: string;
  email?: string;
  nickname?: string;
  name?: string;
  totalScore?: number;
  points?: number;
  level?: number;
  completedLessons?: number;
  createdAt?: string;
}

interface Student {
  _id: string;
  email: string;
  nickname: string;
  role: string;
  createdAt: string;
  progress?: {
    points: number;
    level: number;
    completedLessons: number;
  };
}

export default function TeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Teachers can access reports API
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Vui lòng đăng nhập lại');
      }

      // Try to get student progress data (which teachers can access)
      const response = await fetch(`${API_BASE}/api/reports/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      console.log('👥 Students from reports:', response.status, data);
      
      if (response.ok) {
        // Backend returns { students: [...] }
        const studentsData = data.students || data || [];
        
        // Map the data to Student interface
        const studentList = studentsData.map((item: StudentData) => ({
          _id: item._id || item.userId,
          email: item.email || 'N/A',
          nickname: item.nickname || item.name || 'Student',
          role: 'STUDENT',
          createdAt: item.createdAt || new Date().toISOString(),
          progress: {
            points: item.totalScore || item.points || 0,
            level: item.level || 1,
            completedLessons: item.completedLessons || 0
          }
        }));
        setStudents(studentList);
      } else {
        // If reports API not available, show empty state
        console.warn('Reports API not available, showing empty state');
        setStudents([]);
      }
    } catch (err: unknown) {
      console.error('❌ Error:', err);
      // Don't show error, just show empty state
      setStudents([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải danh sách học viên...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchStudents}
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-green-600" size={36} />
            Học viên của tôi
          </h1>
          <p className="text-gray-500 mt-1">Quản lý và theo dõi tiến độ học viên</p>
        </div>
        <Link 
          to="/teacher/dashboard"
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg font-medium"
        >
          <ArrowLeft size={20} />
          Quay lại Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-green-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng học viên</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Award className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tổng điểm</p>
              <p className="text-3xl font-bold text-gray-900">
                {students.reduce((sum, s) => sum + (s.progress?.points || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-purple-500 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bài học hoàn thành</p>
              <p className="text-3xl font-bold text-gray-900">
                {students.reduce((sum, s) => sum + (s.progress?.completedLessons || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Danh sách học viên</h3>
        </div>
        
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Học viên
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Tiến độ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {student.nickname?.charAt(0)?.toUpperCase() || student.email?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {student.nickname || 'Student'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Tham gia: {new Date(student.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail size={16} className="text-gray-400" />
                        {student.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <Award size={14} className="mr-1" />
                          Level {student.progress?.level || 1}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <TrendingUp size={14} className="mr-1" />
                          {student.progress?.points || 0} điểm
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          <BookOpen size={14} className="mr-1" />
                          {student.progress?.completedLessons || 0} bài
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có học viên</h3>
            <p className="text-gray-500">Danh sách học viên sẽ hiển thị ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
}

