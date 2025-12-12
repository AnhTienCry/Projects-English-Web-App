import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Brain,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { apiCall } from '../../utils/api';
import CreateQuizModal from '../../components/admin/CreateQuizModal';

interface Quiz {
  _id: string;
  question?: string;
  title?: string;
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'matching';
  lesson?: {
    _id: string;
    title: string;
    level: number;
  };
  topic?: {
    _id: string;
    title: string;
  };
  options?: string[];
  correctAnswer: string | string[];
  pairs?: { left: string; right: string }[];
  explanation?: string;
  timeLimit?: number;
  passingScore?: number;
  isActive: boolean;
  createdAt: string;
}

interface Topic {
  _id: string;
  title: string;
  lessonId: string;
}

interface Lesson {
  _id: string;
  title: string;
  level: number;
  order: number;
}

const AdminQuizzes = () => {
  const [searchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>(searchParams.get('lesson') || 'ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>(searchParams.get('topic') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  // Fetch quizzes when filters change
  useEffect(() => {
    fetchQuizzes();
  }, [selectedLesson, selectedTopic, searchQuery]);

  // Fetch topics when lesson is selected
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (selectedLesson && selectedLesson !== 'ALL') {
      fetchTopicsByLesson(selectedLesson);
      // If topic param exists in URL, set it
      if (topicParam) {
        setSelectedTopic(topicParam);
      }
    } else {
      setTopics([]);
      if (!topicParam) {
        setSelectedTopic(''); // Reset topic filter when lesson is cleared (unless topic param exists)
      }
    }
  }, [selectedLesson, searchParams]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params for backend filtering
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedLesson && selectedLesson !== 'ALL') params.append('lesson', selectedLesson);
      if (selectedTopic) params.append('topic', selectedTopic);
      
      const url = params.toString() ? `/api/quizzes?${params.toString()}` : '/api/quizzes';
      const response = await apiCall(url);
      const data = await response.json();
      setQuizzes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const response = await apiCall('/api/lessons');
      const data = await response.json();
      setLessons(data);
    } catch (err: any) {
      console.error('Error fetching lessons:', err);
    }
  };

  const fetchTopicsByLesson = async (lessonId: string) => {
    if (!lessonId || lessonId === 'ALL') {
      setTopics([]);
      return;
    }
    
    try {
      const response = await apiCall(`/api/topics/${lessonId}`);
      const data = await response.json();
      setTopics(data || []);
    } catch (err: any) {
      console.error('Error fetching topics:', err);
      setTopics([]);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa quiz "${title}" không?`)) return;
    
    try {
      await apiCall(`/api/quizzes/${id}`, { method: 'DELETE' });
      setQuizzes(quizzes.filter(q => q._id !== id));
      alert('✅ Đã xóa quiz thành công!');
    } catch (err: any) {
      alert('❌ Không thể xóa quiz: ' + err.message);
    }
  };

  // Quizzes are already filtered by backend, so use them directly
  // But we still need to filter by search query on frontend if needed
  const filteredQuizzes = quizzes.filter(quiz => {
    if (!searchQuery) return true;
    const quizTitle = quiz.question || quiz.title || '';
    return quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.explanation && quiz.explanation.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Đang tải dữ liệu...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Brain className="text-purple-600" size={28} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý Quizzes</h1>
              </div>
              <p className="text-gray-600">Quản lý tất cả bài kiểm tra và câu hỏi</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              Tạo quiz mới
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Tìm kiếm quiz..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Filter by Lesson */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-600" size={20} />
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="ALL">Tất cả bài học</option>
                {lessons.map((lesson) => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.title} (Level {lesson.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Topic */}
            <div className="flex items-center gap-2">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={selectedLesson === 'ALL' || !selectedLesson}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Tất cả chủ đề</option>
                {topics.map((topic) => (
                  <option key={topic._id} value={topic._id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <span>Tổng: <span className="font-semibold text-gray-900">{quizzes.length}</span></span>
            <span>Hiển thị: <span className="font-semibold text-gray-900">{filteredQuizzes.length}</span></span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Quizzes Grid */}
        {filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Brain className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">
              {searchQuery || selectedLesson !== 'ALL' ? 'Không tìm thấy quiz nào' : 'Chưa có quiz nào. Hãy tạo quiz đầu tiên!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <Brain size={24} />
                    {quiz.isActive ? (
                      <span className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        <CheckCircle size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        <XCircle size={12} />
                        Inactive
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg line-clamp-2">{quiz.question || quiz.title || 'No title available'}</h3>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {quiz.explanation && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {quiz.explanation}
                    </p>
                  )}

                  {/* Quiz Info */}
                  <div className="space-y-2 mb-4">
                    {quiz.lesson && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen size={14} />
                        <span>{quiz.lesson?.title || 'Unknown Lesson'} (Level {quiz.lesson?.level || '?'})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HelpCircle size={14} />
                      <span className="capitalize">{quiz.type?.replace('_', ' ') || 'Unknown'}</span>
                    </div>
                    {quiz.timeLimit && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>{quiz.timeLimit}s</span>
                      </div>
                    )}
                  </div>

                  {/* Question Preview */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {quiz.question || quiz.title || 'No content available'}
                    </p>
                  </div>


                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setShowCreateModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit2 size={16} />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(quiz._id, quiz.question || quiz.title || 'Unknown Quiz')}
                      className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Quiz Modal */}
      {showCreateModal && (
        <CreateQuizModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingQuiz(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingQuiz(null);
            fetchQuizzes();
          }}
          editQuiz={editingQuiz || undefined}
        />
      )}
    </div>
  );
};

export default AdminQuizzes;

