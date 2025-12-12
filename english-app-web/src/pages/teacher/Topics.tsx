import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import api from '../../api/http';
import { getTopicsByLesson, createTopic, deleteTopic } from '../../api/topicsApi';
import { getAllLessons } from '../../api/lessonsApi';

interface Topic {
  _id: string;
  lessonId: string | { _id: string; title: string };
  title: string;
  description?: string;
  order: number;
  isPublished?: boolean;
  createdAt: string;
}

interface Lesson {
  _id: string;
  title: string;
  level: number;
}

export default function TeacherTopics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLesson, setFilterLesson] = useState('');
  const [formData, setFormData] = useState({
    lessonId: '',
    title: '',
    description: '',
    order: 1,
    isPublished: true
  });

  // Đọc lesson từ URL query param khi component mount
  useEffect(() => {
    const lessonFromUrl = searchParams.get('lesson');
    if (lessonFromUrl) {
      setFilterLesson(lessonFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [filterLesson]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const lessonsRes = await getAllLessons();
      setLessons(lessonsRes.data || []);

      // Fetch all topics or filter by lesson
      if (filterLesson) {
        const topicsRes = await getTopicsByLesson(filterLesson);
        setTopics(topicsRes.data || []);
      } else {
        // Fetch all topics from all lessons
        const allTopics: Topic[] = [];
        for (const lesson of lessonsRes.data || []) {
          try {
            const res = await getTopicsByLesson(lesson._id);
            const topicsWithLesson = (res.data || []).map((t: any) => ({
              ...t,
              lessonId: lesson
            }));
            allTopics.push(...topicsWithLesson);
          } catch (err) {
            console.error(`Error fetching topics for lesson ${lesson._id}:`, err);
          }
        }
        setTopics(allTopics);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (lesson?: Lesson) => {
    if (lesson) {
      setFormData({ ...formData, lessonId: lesson._id });
    } else {
      setFormData({
        lessonId: '',
        title: '',
        description: '',
        order: 1,
        isPublished: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lessonId) {
      alert('Vui lòng chọn bài học');
      return;
    }

    try {
      await createTopic(formData);
      setShowModal(false);
      setFormData({
        lessonId: '',
        title: '',
        description: '',
        order: 1,
        isPublished: true
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create topic:', err);
      alert('Không thể tạo topic. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa topic "${title}"?`)) return;
    
    try {
      await deleteTopic(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete topic:', err);
      alert('Không thể xóa topic. Vui lòng thử lại.');
    }
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = searchTerm === '' || 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.description && topic.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Layers className="text-green-600" size={32} />
            Quản lý Topics
          </h1>
          <p className="text-gray-500 mt-1">Quản lý chủ đề học tập cho từng bài học</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg"
        >
          <Plus size={20} />
          Tạo Topic mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-gray-600" size={20} />
            <select
              value={filterLesson}
              onChange={(e) => setFilterLesson(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Tất cả bài học</option>
              {lessons.map(lesson => (
                <option key={lesson._id} value={lesson._id}>
                  {lesson.title} (Level {lesson.level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6 text-sm text-gray-600">
          <span>Tổng: <span className="font-semibold text-gray-900">{topics.length}</span></span>
          <span>Hiển thị: <span className="font-semibold text-gray-900">{filteredTopics.length}</span></span>
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Layers className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">
            {searchTerm || filterLesson ? 'Không tìm thấy topic nào' : 'Chưa có topic nào. Hãy tạo topic đầu tiên!'}
          </p>
          {!filterLesson && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              <Plus size={18} />
              Tạo Topic ngay
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map((topic) => {
            const lesson = typeof topic.lessonId === 'object' ? topic.lessonId : null;
            
            return (
              <div
                key={topic._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group"
              >
                {/* Card Header - Cyan (xanh nước biển) */}
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <Layers size={24} />
                    {topic.isPublished ? (
                      <span className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        <Eye size={12} />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        <EyeOff size={12} />
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg line-clamp-2">{topic.title}</h3>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {topic.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {topic.description}
                    </p>
                  )}

                  {/* Topic Info */}
                  <div className="space-y-2 mb-4">
                    {lesson && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen size={14} />
                        <span>{lesson.title} (Level {(lesson as any).level || '?'})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-xs font-semibold text-gray-500">ORDER:</span>
                      <span className="font-medium">{topic.order}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/teacher/topics/${topic._id}`)}
                      className="flex-1 flex items-center justify-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      Xem chi tiết
                    </button>
                    <button
                      onClick={() => handleDelete(topic._id, topic.title)}
                      className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-900">Tạo Topic mới</h2>
              <p className="text-gray-600 text-sm mt-1">Thêm chủ đề học mới cho bài học</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Lesson */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bài học <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.lessonId}
                    onChange={(e) => setFormData(prev => ({ ...prev, lessonId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn bài học --</option>
                    {lessons.map(lesson => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.title} (Level {lesson.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Morning Routine"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Learn English through morning activities"
                  />
                </div>

                {/* Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: Number(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trạng thái
                    </label>
                    <div className="flex items-center gap-3 h-10">
                      <input
                        type="checkbox"
                        id="isPublished"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="isPublished" className="text-sm text-gray-700 cursor-pointer">
                        Published
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
                >
                  Tạo Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

