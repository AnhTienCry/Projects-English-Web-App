import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  ArrowRight,
  BookMarked,
  Brain,
  Video,
  FileText
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

export default function AdminTopics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
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

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    const lessonId = typeof topic.lessonId === 'object' ? topic.lessonId._id : topic.lessonId;
    setFormData({
      lessonId: lessonId as string,
      title: topic.title,
      description: topic.description || '',
      order: topic.order,
      isPublished: topic.isPublished !== undefined ? topic.isPublished : true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lessonId) {
      alert('Vui lòng chọn bài học');
      return;
    }

    try {
      if (editingTopic) {
        // Update existing topic
        await api.put(`/api/topics/${editingTopic._id}`, formData);
      } else {
        // Create new topic
        await createTopic(formData);
      }
      setShowModal(false);
      setEditingTopic(null);
      setFormData({
        lessonId: '',
        title: '',
        description: '',
        order: 1,
        isPublished: true
      });
      fetchData();
    } catch (err) {
      console.error('Failed to save topic:', err);
      alert('Không thể lưu topic. Vui lòng thử lại.');
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
            <Layers className="text-blue-600" size={32} />
            Quản lý Topics
          </h1>
          <p className="text-gray-500 mt-1">Quản lý chủ đề học tập cho từng bài học</p>
        </div>
        <button
          onClick={() => {
            setEditingTopic(null);
            handleOpenModal();
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-gray-600" size={20} />
            <select
              value={filterLesson}
              onChange={(e) => setFilterLesson(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
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
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden"
              >
                {/* Card Header - Cyan (xanh nước biển) */}
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers size={20} />
                        {lesson && (
                          <span className="text-sm font-medium">Level {(lesson as any).level || '?'}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg line-clamp-2">{topic.title}</h3>
                    </div>
                    <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-medium">
                      #{topic.order}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {topic.description || 'Chưa có mô tả'}
                  </p>

                  {/* Status Badges */}
                  <div className="flex gap-2 mb-4">
                    {topic.isPublished ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full">
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
                      onClick={() => handleEditTopic(topic)}
                      className="flex items-center justify-center gap-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedTopic(topic)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      Chi tiết
                    </button>
                    <button
                      onClick={() => handleDelete(topic._id, topic.title)}
                      className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Publish Toggle - Similar to Lesson */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        try {
                          await api.patch(`/api/topics/${topic._id}/publish`);
                          fetchData();
                        } catch (err) {
                          console.error('Failed to toggle publish:', err);
                          alert('Không thể thay đổi trạng thái');
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        topic.isPublished
                          ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-800'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      {topic.isPublished ? (
                        <>
                          <Eye size={16} />
                          Đã xuất bản
                        </>
                      ) : (
                        <>
                          <EyeOff size={16} />
                          Nháp
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-2xl font-bold text-gray-900">{editingTopic ? 'Chỉnh sửa Topic' : 'Tạo Topic mới'}</h2>
              <p className="text-gray-600 text-sm mt-1">{editingTopic ? 'Cập nhật thông tin chủ đề' : 'Thêm chủ đề học mới cho bài học'}</p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
                >
                  {editingTopic ? 'Cập nhật' : 'Tạo Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Detail Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-100 p-2 rounded-lg">
                    <Layers className="text-cyan-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {typeof selectedTopic.lessonId === 'object' && selectedTopic.lessonId.title
                        ? `${selectedTopic.lessonId.title} • `
                        : ''}
                      Thứ tự: {selectedTopic.order}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-6 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <p className="text-sm text-cyan-800">
                  🧩 Quản lý theo cấu trúc: Bài học → Chủ đề (Topic) → Từ vựng, Quiz, Video, Story.
                </p>
              </div>

              {/* 4 Cards for Content Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Từ vựng */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <BookMarked className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Từ vựng</h3>
                        <p className="text-sm text-gray-600">Quản lý từ vựng cho topic</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const topicId = selectedTopic._id;
                        const lessonId = typeof selectedTopic.lessonId === 'object' 
                          ? selectedTopic.lessonId._id 
                          : selectedTopic.lessonId;
                        setSelectedTopic(null);
                        navigate(`/admin/vocabularies?lesson=${lessonId}&topic=${topicId}`);
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Mở
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Câu hỏi */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500 p-2 rounded-lg">
                        <Brain className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Câu hỏi</h3>
                        <p className="text-sm text-gray-600">Quản lý quiz cho topic</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const topicId = selectedTopic._id;
                        const lessonId = typeof selectedTopic.lessonId === 'object' 
                          ? selectedTopic.lessonId._id 
                          : selectedTopic.lessonId;
                        setSelectedTopic(null);
                        navigate(`/admin/quizzes?lesson=${lessonId}&topic=${topicId}`);
                      }}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Mở
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Video */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <Video className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Video</h3>
                        <p className="text-sm text-gray-600">Quản lý video cho topic</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const topicId = selectedTopic._id;
                        const lessonId = typeof selectedTopic.lessonId === 'object' 
                          ? selectedTopic.lessonId._id 
                          : selectedTopic.lessonId;
                        setSelectedTopic(null);
                        navigate(`/admin/videos?lesson=${lessonId}&topic=${topicId}`);
                      }}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Mở
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Truyện chêm */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <FileText className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Truyện chêm</h3>
                        <p className="text-sm text-gray-600">Quản lý story cho topic</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const topicId = selectedTopic._id;
                        const lessonId = typeof selectedTopic.lessonId === 'object' 
                          ? selectedTopic.lessonId._id 
                          : selectedTopic.lessonId;
                        setSelectedTopic(null);
                        navigate(`/admin/stories?lesson=${lessonId}&topic=${topicId}`);
                      }}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Mở
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button
                onClick={() => setSelectedTopic(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

