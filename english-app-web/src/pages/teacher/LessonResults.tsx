import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Users, TrendingUp, Clock } from 'lucide-react';
import { apiCall } from '../../utils/api';

interface LessonResult {
  _id: string;
  user: {
    _id: string;
    nickname: string;
    email: string;
  };
  score: number;
  timeSpent: number;
  isPassed: boolean;
  completedAt: string;
}

export default function LessonResults() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [results, setResults] = useState<LessonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonTitle, setLessonTitle] = useState('');

  useEffect(() => {
    fetchResults();
  }, [lessonId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [lessonRes, resultsRes] = await Promise.all([
        apiCall(`/api/lessons/${lessonId}`).then(res => res.json()),
        apiCall(`/api/lesson-results/${lessonId}/results`).then(res => res.json())
      ]);
      setLessonTitle(lessonRes.title);
      setResults(resultsRes);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
    : 0;
  const passRate = results.length > 0
    ? ((results.filter(r => r.isPassed).length / results.length) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="text-green-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">{lessonTitle}</h1>
        </div>
        <p className="text-gray-600">Kết quả học viên</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">Số học viên</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{results.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">Điểm TB</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgScore}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-purple-600" size={24} />
            <h3 className="text-sm font-medium text-gray-600">Tỷ lệ đạt</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{passRate}%</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chi tiết kết quả</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Học viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian (phút)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hoàn thành
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.user.nickname || result.user.email}
                      </div>
                      <div className="text-sm text-gray-500">{result.user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {result.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(result.timeSpent / 60)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.isPassed ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Đạt
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Chưa đạt
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(result.completedAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
              <p>Chưa có kết quả nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}










