import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, BookOpen, FileText } from 'lucide-react';
import * as storyAPI from '../../api/storyAPI';
import * as lessonApi from '../../api/lessonsApi';
import * as vocabApi from '../../api/vocabApi';

interface Lesson {
  _id: string;
  title: string;
}

interface Topic {
  _id: string;
  title: string;
  lessonId: string;
}

interface Vocabulary {
  _id: string;
  word: string;
  meaning: string;
  phonetic?: string;
}

interface Story {
  _id: string;
  content: string;
  lesson?: { _id: string; title: string };
  topic?: { _id: string; title: string };
  updatedAt?: string;
  selectedVocabIds?: string[];
  selectedVocabCount?: number;
  totalVocabCount?: number;
}

interface StoryFormData {
  content: string;
  lesson: string;
  topic: string;
}

export default function AdminStories() {
  const [searchParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState<StoryFormData>({ content: '', lesson: '', topic: '' });
  const [selectedLesson, setSelectedLesson] = useState('');
  const [filterLesson, setFilterLesson] = useState(searchParams.get('lesson') || '');
  const [filterTopic, setFilterTopic] = useState(searchParams.get('topic') || '');
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [lessonVocabs, setLessonVocabs] = useState<Vocabulary[]>([]);
  const [loadingVocabs, setLoadingVocabs] = useState(false);
  const [modalSelectedVocabIds, setModalSelectedVocabIds] = useState<Set<string>>(new Set());
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch topics when filterLesson changes
  useEffect(() => {
    if (filterLesson) {
      fetchTopicsByLesson(filterLesson);
    } else {
      setTopics([]);
      setFilterTopic(''); // Reset topic filter when lesson is cleared
    }
  }, [filterLesson]);

  useEffect(() => { 
    const lessonParam = searchParams.get('lesson');
    const topicParam = searchParams.get('topic');
    if (lessonParam) {
      setFilterLesson(lessonParam);
      setSelectedLesson(lessonParam);
      // Auto-open modal to create story if lesson is specified and no story exists
      const existingStory = stories.find(s => s.lesson?._id === lessonParam);
      if (!existingStory && topicParam) {
        // If topic is specified, set both lesson and topic
        setFormData(prev => ({ ...prev, lesson: lessonParam, topic: topicParam }));
      } else if (!existingStory) {
        setFormData(prev => ({ ...prev, lesson: lessonParam }));
      }
    }
    if (topicParam) {
      setFilterTopic(topicParam);
    }
    fetchData(); 
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [storiesRes, lessonsRes] = await Promise.all([
        storyAPI.getAllStories(),
        lessonApi.getAllLessons()
      ]);
      setStories(storiesRes.data || []);
      setLessons(lessonsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicsByLesson = async (lessonId: string) => {
    if (!lessonId) {
      setTopics([]);
      return;
    }
    
    try {
      const response = await lessonApi.getTopicsByLesson(lessonId);
      setTopics(response.data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    }
  };

  const handleLessonChange = async (lessonId: string) => {
    setSelectedLesson(lessonId);
    setFormData(prev => ({ ...prev, lesson: lessonId, topic: '' }));
    await fetchTopicsByLesson(lessonId);
    setLessonVocabs([]);
    setModalSelectedVocabIds(new Set());
  };

  const fetchVocabsForTopic = async (topicId: string) => {
    if (!topicId) return;
    try {
      setLoadingVocabs(true);
      const res = await vocabApi.getVocabByTopic(topicId);
      setLessonVocabs(res.data?.vocabs || res.data || []);
    } catch (err) {
      console.error("Failed to fetch topic vocabularies:", err);
      setLessonVocabs([]);
    } finally {
      setLoadingVocabs(false);
    }
  };

  const handleOpenModal = async (story?: Story) => {
    if (story) {
      setEditingStory(story);
      const lessonId = story.lesson?._id || '';
      const topicId = story.topic?._id || '';
      
      setSelectedLesson(lessonId);
      
      // Load topics if lesson exists
      if (lessonId) {
        await fetchTopicsByLesson(lessonId);
      }
      
      setFormData({ content: story.content, lesson: lessonId, topic: topicId });
      
      // Load vocabs for topic
      if (topicId) {
        await fetchVocabsForTopic(topicId);
      }
      
      setModalSelectedVocabIds(new Set(story.selectedVocabIds || []));
    } else {
      setEditingStory(null);
      setSelectedLesson('');
      setTopics([]);
      setFormData({ content: '', lesson: '', topic: '' });
      setLessonVocabs([]);
      setModalSelectedVocabIds(new Set());
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic) {
      alert('Vui lòng chọn chủ đề.');
      return;
    }
    try {
      if (editingStory) {
        await storyAPI.updateStoryByTopicId(formData.topic, {
          content: formData.content,
          selectedVocabIds: Array.from(modalSelectedVocabIds),
        });
        alert('✅ Cập nhật truyện thành công.');
      } else {
        await storyAPI.createStoryByTopicId(formData.topic, {
          content: formData.content,
          selectedVocabIds: Array.from(modalSelectedVocabIds),
        });
        alert('✅ Tạo truyện mới thành công.');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 400) {
        alert(err.response.data?.message || 'Topic này đã có truyện. Hãy xóa trước khi tạo mới.');
      } else {
        console.error('Failed to save story:', err);
        alert('Không thể lưu truyện. Vui lòng thử lại.');
      }
    }
  };

  const handleDelete = async (story: Story) => {
    const storyTitle = story.topic?.title || story.lesson?.title || 'Unknown';
    if (!confirm(`Bạn có chắc muốn xóa truyện: "${storyTitle}"?`)) return;
    try {
      if (story.topic?._id) {
        await storyAPI.deleteStoryByTopicId(story.topic._id);
      } else if (story.lesson?._id) {
        // Fallback for old data
        await storyAPI.deleteStoryByLessonId(story.lesson._id);
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete story:', err);
      alert('Không thể xóa truyện. Vui lòng thử lại.');
    }
  };

  const filteredStories = stories.filter(s => {
    const matchesLesson = !filterLesson || s.lesson?._id === filterLesson;
    const matchesTopic = !filterTopic || s.topic?._id === filterTopic;
    return matchesLesson && matchesTopic;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
            <FileText className="text-green-600" size={32} /> Quản lý Truyện Chêm
          </h1>
          <p className="text-gray-500 mt-1">Thêm và quản lý truyện cho bài học</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition shadow-lg">
          <Plus size={20} /> Thêm/Sửa truyện
        </button>
      </div>

      {/* Filter by Lesson and Topic */}
      {lessons.length > 0 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <label className="font-medium text-gray-700">Lọc theo:</label>
          <select
            value={filterLesson}
            onChange={(e) => setFilterLesson(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">— Tất cả bài học —</option>
            {lessons.map(l => <option key={l._id} value={l._id}>{l.title}</option>)}
          </select>
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            disabled={!filterLesson}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">— Tất cả chủ đề —</option>
            {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select>
          {(filterLesson || filterTopic) && (
            <button
              onClick={() => {
                setFilterLesson('');
                setFilterTopic('');
              }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Bài học</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nội dung</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Vocabs Selected</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStories.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><BookOpen className="mx-auto mb-3 text-gray-300" size={48} />Chưa có truyện nào</td></tr>
            ) : (
              filteredStories.map(story => (
                <tr key={story._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{story.lesson?.title}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-sm truncate">{story.content}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{story.selectedVocabCount ?? 0} / {story.totalVocabCount ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleOpenModal(story)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(story)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-2xl font-bold">{editingStory ? 'Chỉnh sửa truyện chêm' : 'Thêm truyện mới'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Lesson and Topic */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Lesson */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bài học <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedLesson || formData.lesson}
                    onChange={(e) => handleLessonChange(e.target.value)}
                    disabled={!!editingStory}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">-- Chọn bài học --</option>
                    {lessons.map(l => <option key={l._id} value={l._id}>{l.title}</option>)}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chủ đề <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.topic}
                    onChange={async (e) => {
                      const topicId = e.target.value;
                      setFormData(p => ({ ...p, topic: topicId }));
                      if (topicId) await fetchVocabsForTopic(topicId);
                    }}
                    disabled={!selectedLesson && !formData.lesson}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn chủ đề --</option>
                    {topics.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select>
                  {(!selectedLesson && !formData.lesson) && (
                    <p className="text-xs text-gray-500 mt-1">Vui lòng chọn bài học trước</p>
                  )}
                </div>
              </div>

              {/* Nội dung */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium">Nội dung truyện *</label>
                  {formData.topic && (
                    <button type="button" onClick={() => setShowVocabModal(true)} className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-md">📚 Chọn Từ vựng</button>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  required
                  value={formData.content}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, content: e.target.value }));
                    setCursorPosition(e.target.selectionStart);
                  }}
                  onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                  onKeyUp={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={15}
                />
              </div>

              <div className="flex justify-end gap-4 border-t pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal từ vựng */}
      {showVocabModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[75vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h3 className="text-xl font-bold">Chọn Từ vựng</h3>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {lessonVocabs.length ? (
                <ul className="space-y-2">
                  {lessonVocabs.map(vocab => {
                    const isSelected = modalSelectedVocabIds.has(vocab._id);
                    return (
                      <li key={vocab._id}
                        onClick={() => {
                          setModalSelectedVocabIds(prev => {
                            const next = new Set(prev);
                            const word = vocab.word.trim();

                            if (next.has(vocab._id)) {
                              next.delete(vocab._id);
                              setFormData(prevForm => ({
                                ...prevForm,
                                content: prevForm.content
                                  .replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
                                  .replace(/\s{2,}/g, ' ')
                                  .trim()
                              }));
                            } else {
                              next.add(vocab._id);
                              setFormData(prevForm => {
                                const before = prevForm.content.slice(0, cursorPosition);
                                const after = prevForm.content.slice(cursorPosition);
                                const newContent = `${before}${word} ${after}`;
                                setTimeout(() => {
                                  if (textareaRef.current) {
                                    const newPos = before.length + word.length + 1;
                                    textareaRef.current.focus();
                                    textareaRef.current.setSelectionRange(newPos, newPos);
                                  }
                                }, 0);
                                return { ...prevForm, content: newContent };
                              });
                            }
                            return next;
                          });
                        }}
                        className={`p-3 border rounded-md flex items-center gap-3 cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4" />
                        <div>
                          <strong className="text-indigo-700">{vocab.word}</strong>
                          <span className="text-gray-600"> — {vocab.meaning}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-gray-500">Không có từ vựng nào.</p>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between text-sm text-gray-600">
              <span>Đã chọn: {modalSelectedVocabIds.size} / {lessonVocabs.length}</span>
              <button onClick={() => setShowVocabModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

