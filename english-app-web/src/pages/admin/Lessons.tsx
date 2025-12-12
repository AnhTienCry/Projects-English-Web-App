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
  ArrowRight
} from 'lucide-react';
import { getAllLessons, deleteLesson } from '../../api/lessonsApi';
import LessonPublishToggle from '../../components/lessons/LessonPublishToggle';
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

const AdminLessons: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
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
                <div className="flex gap-2">
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

                {/* Publish Toggle */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <LessonPublishToggle
                    lessonId={lesson._id}
                    isPublished={lesson.isPublished}
                    onToggle={fetchLessons}
                  />
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

            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div>
                <div className="text-center py-12">
                  <BookMarked className="mx-auto text-blue-500 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quản lý Chủ đề (Topic)</h3>
                  <p className="text-gray-600 mb-6">
                    Mở trang quản lý topic cho bài học "{selectedLesson.title}"
                  </p>
                  <button
                    onClick={() => {
                      const id = selectedLesson._id;
                      setSelectedLesson(null);
                      navigate(`/admin/topics?lesson=${id}`);
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg font-medium"
                  >
                    <BookMarked size={20} />
                    Mở Topic của bài học
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button
                onClick={() => setSelectedLesson(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Quay lại
              </button>
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

export default AdminLessons;