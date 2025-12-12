import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, BookOpen, Brain, TrendingUp, ArrowLeft } from 'lucide-react';
import { apiCall } from '../../utils/api';

interface StudentData {
  user: {
    _id: string;
    email: string;
    nickname?: string;
    createdAt: string;
  };
  lessonResults: any[];
  quizResults: any[];
  activities: any[];
  progress?: {
    completedLessons: number;
    completedTopics: number;
    totalScore: number;
    level: number;
  };
}

export default function AdminStudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [userId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      // Use reports API to get student progress
      const res = await apiCall(`/api/reports/student/${userId || ''}`);
      const json = await res.json();
      
      // Transform data to match interface
      setData({
        user: json.user,
        lessonResults: [],
        quizResults: [],
        activities: [],
        progress: json.progress
      });
    } catch (err) {
      console.error('Failed to fetch student data:', err);
      // Try alternative endpoint
      try {
        const res = await apiCall(`/api/users/${userId}`);
        const json = await res.json();
        setData({
          user: json,
          lessonResults: [],
          quizResults: [],
          activities: [],
          progress: {
            completedLessons: 0,
            completedTopics: 0,
            totalScore: 0,
            level: 1
          }
        });
      } catch (e) {
        console.error('Failed with alternative endpoint:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu học viên...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Link to="/admin/users" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft size={20} />
          Quay lại danh sách người dùng
        </Link>
        <div className="text-center py-12 text-gray-500">
          <User className="mx-auto mb-4 text-gray-400" size={48} />
          <p>Không tìm thấy học viên</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <Link to="/admin/users" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft size={20} />
        Quay lại danh sách người dùng
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-full">
              <span className="text-white font-semibold text-xl">
                {data.user.nickname ? data.user.nickname[0].toUpperCase() : data.user.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {data.user.nickname || 'Học viên'}
              </h1>
              <p className="text-gray-600">{data.user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Tham gia: {new Date(data.user.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="text-blue-600" size={24} />
            <h3 className="text-sm font-medium text-gray-700">Bài học hoàn thành</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{data.progress?.completedLessons || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="text-purple-600" size={24} />
            <h3 className="text-sm font-medium text-gray-700">Chủ đề hoàn thành</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{data.progress?.completedTopics || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-sm font-medium text-gray-700">Tổng điểm</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{data.progress?.totalScore || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-orange-600" size={24} />
            <h3 className="text-sm font-medium text-gray-700">Level</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{data.progress?.level || 1}</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin tiến độ</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Email</span>
            <span className="font-medium text-gray-900">{data.user.email}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Tên hiển thị</span>
            <span className="font-medium text-gray-900">{data.user.nickname || 'Chưa đặt tên'}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Ngày tạo tài khoản</span>
            <span className="font-medium text-gray-900">{new Date(data.user.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Điểm số hiện tại</span>
            <span className="font-medium text-green-600">{data.progress?.totalScore || 0} điểm</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {(!data.progress || data.progress.totalScore === 0) && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Chưa có tiến độ học tập</h3>
              <p className="text-yellow-700">
                Học viên này chưa hoàn thành bài học hoặc quiz nào. 
                Tiến độ sẽ được cập nhật khi học viên bắt đầu học.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













