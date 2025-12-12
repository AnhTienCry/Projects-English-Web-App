import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Filter,
  BookMarked,
  HelpCircle,
  ArrowRight,
  Video,
  FileText
} from 'lucide-react';
import { getAllLessons, deleteLesson } from '../../api/lessonsApi';
import CreateLessonModal from '../../components/admin/CreateLessonModal';

interface Lesson {
  _id: string;
  title: string;
  description: string;
  level: number | string;
  order: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  isPublished: boolean;
}

const TeacherLessons: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'questions' | 'video' | 'story'>('vocabulary');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await getAllLessons();
      setLessons(res.data);
    } catch (err: any) {
      setError('Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài học này không?')) return;
    try {
      await deleteLesson(id);
      setLessons(lessons.filter(l => l._id !== id));
    } catch {
      alert('Không thể xóa bài học.');
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = searchQuery === '' || 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || lesson.level.toString() === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const uniqueLevels = Array.from(new Set(lessons.map(l => l.level.toString()))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
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
                <div className="bg-green-100 p-2 rounded-lg">
                  <BookOpen className="text-green-600" size={28} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý bài học</h1>
              </div>
              <p className="text-gray-600">Quản lý tất cả bài học và nội dung học tập</p>
            </div>
            <button
              onClick={() => {
                setEditingLesson(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              Tạo bài học mới
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
                  placeholder="Tìm kiếm bài học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Filter by Level */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="text-gray-600" size={20} />
              <span className="font-medium text-gray-700">Cấp độ:</span>
              <button
                onClick={() => setFilterLevel('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterLevel === 'ALL'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {uniqueLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterLevel === level
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Level {level}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <span>Tổng: <span className="font-semibold text-gray-900">{lessons.length}</span></span>
            <span>Hiển thị: <span className="font-semibold text-gray-900">{filteredLessons.length}</span></span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <div
              key={lesson._id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={20} />
                      <span className="text-sm font-medium">Level {lesson.level}</span>
                    </div>
                    <h3 className="font-bold text-lg line-clamp-2">{lesson.title}</h3>
                  </div>
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium">
                    #{lesson.order}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {lesson.description || 'Chưa có mô tả'}
                </p>

                {/* Status Badges */}
                <div className="flex gap-2 mb-4">
                  {lesson.isPublished ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      <Eye size={12} />
                      Đã xuất bản
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                      <EyeOff size={12} />
                      Nháp
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      setEditingLesson(lesson);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center justify-center gap-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedLesson(lesson)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Eye size={16} />
                    Chi tiết
                  </button>
                  <button
                    onClick={() => handleDelete(lesson._id)}
                    className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Read-only Publish Status */}
                <div className="pt-3 border-t border-gray-200">
                  <div className={`w-full px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
                    lesson.isPublished
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {lesson.isPublished ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Đã xuất bản</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <span>Chưa xuất bản</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    ℹ️ Chỉ Admin mới có thể thay đổi trạng thái xuất bản
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLessons.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Không tìm thấy bài học nào</p>
          </div>
        )}
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <BookMarked className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedLesson.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Level {selectedLesson.level} • Thứ tự: {selectedLesson.order}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-6 flex-wrap">
                <button
                  onClick={() => setActiveTab('vocabulary')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'vocabulary'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BookMarked size={18} />
                  Từ vựng
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'questions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <HelpCircle size={18} />
                  Câu hỏi
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'video'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Video size={18} />
                  Video
                </button>
                <button
                  onClick={() => setActiveTab('story')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'story'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FileText size={18} />
                  Truyện chêm
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeTab === 'vocabulary' ? (
                <div>
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      📝 Quản lý từ vựng cho bài học này. Từ vựng giúp học viên học từ mới hiệu quả hơn.
                    </p>
                  </div>
                  
                  {/* Navigate to Vocabularies Page */}
                  <div className="text-center py-12">
                    <BookMarked className="mx-auto text-blue-500 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Quản lý từ vựng
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click nút bên dưới để quản lý từ vựng cho bài học "{selectedLesson.title}"
                    </p>
                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                        navigate(`/teacher/vocabularies?lesson=${selectedLesson._id}`);
                      }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg font-medium"
                    >
                      <BookMarked size={20} />
                      Quản lý từ vựng
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              ) : activeTab === 'questions' ? (
                <div>
                  <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      ❓ Quản lý câu hỏi quiz cho bài học này. Quiz giúp đánh giá kiến thức học viên.
                    </p>
                  </div>

                  {/* Navigate to Quizzes Page */}
                  <div className="text-center py-12">
                    <HelpCircle className="mx-auto text-purple-500 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Quản lý Quiz
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click nút bên dưới để quản lý quiz cho bài học "{selectedLesson.title}"
                    </p>
                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                        navigate(`/teacher/quizzes?lesson=${selectedLesson._id}`);
                      }}
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg font-medium"
                    >
                      <HelpCircle size={20} />
                      Quản lý Quiz
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              ) : activeTab === 'video' ? (
                <div>
                  <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      🎥 Quản lý video cho bài học này. Video giúp học viên học tập hiệu quả hơn.
                    </p>
                  </div>
                  
                  {/* Navigate to Videos Page */}
                  <div className="text-center py-12">
                    <Video className="mx-auto text-orange-500 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Quản lý Video
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click nút bên dưới để quản lý video cho bài học "{selectedLesson.title}"
                    </p>
                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                        navigate(`/teacher/videos?lesson=${selectedLesson._id}`);
                      }}
                      className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg font-medium"
                    >
                      <Video size={20} />
                      Quản lý Video
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      📚 Quản lý truyện chêm cho bài học này. Truyện chêm giúp học viên học từ vựng trong ngữ cảnh.
                    </p>
                  </div>
                  
                  {/* Navigate to Stories Page */}
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-green-500 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Quản lý Truyện chêm
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click nút bên dưới để quản lý truyện chêm cho bài học "{selectedLesson.title}"
                    </p>
                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                        navigate(`/teacher/stories?lesson=${selectedLesson._id}`);
                      }}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg font-medium"
                    >
                      <FileText size={20} />
                      Quản lý Truyện chêm
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Lesson Modal */}
      {showCreateModal && (
        <CreateLessonModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingLesson(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingLesson(null);
            fetchLessons();
          }}
          editLesson={editingLesson}
        />
      )}
    </div>
  );
};

export default TeacherLessons;
