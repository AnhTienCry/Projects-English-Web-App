import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, BookOpen, Brain, TrendingUp } from 'lucide-react';
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
}

export default function StudentDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [userId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await apiCall(`/api/reports/students/${userId || ''}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch student data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          <User className="mx-auto mb-4 text-gray-400" size={48} />
          <p>Không tìm thấy học viên</p>
        </div>
      </div>
    );
  }

  const avgLessonScore = data.lessonResults.length > 0
    ? (data.lessonResults.reduce((sum: number, r: any) => sum + r.score, 0) / data.lessonResults.length).toFixed(1)
    : 0;
  const avgQuizScore = data.quizResults.length > 0
    ? (data.quizResults.reduce((sum: number, r: any) => sum + r.score, 0) / data.quizResults.length).toFixed(1)
    : 0;

  return (
    <div className="p-6">
      {/* Student Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full">
            <User className="text-green-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {data.user.nickname || data.user.email}
            </h1>
            <p className="text-gray-600">{data.user.email}</p>
            <p className="text-sm text-gray-500">
              Tham gia: {new Date(data.user.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="text-blue-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">Bài học</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.lessonResults.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-purple-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">Quiz</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.quizResults.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">ĐTB Bài học</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgLessonScore}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-orange-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">ĐTB Quiz</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgQuizScore}</p>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
        </div>
        <div className="p-6">
          {data.activities.length > 0 ? (
            <div className="space-y-4">
              {data.activities.map((activity: any) => (
                <div key={activity._id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.activityType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có hoạt động nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}










