import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, BookOpen, Volume2 } from 'lucide-react';
import api from '../../api/http';

interface Lesson {
  _id: string;
  title: string;
}

interface Topic {
  _id: string;
  title: string;
  lessonId: string | { _id: string; title: string };
}

interface Vocabulary {
  _id: string;
  word: string;
  meaning: string;
  phonetic?: string;
  pronunciationUS?: string;
  pronunciationUK?: string;
  partOfSpeech?: string;
  stress?: string;
  example?: string;
  exampleTranslation?: string;
  synonyms?: string[];
  antonyms?: string[];
  lesson?: { _id: string; title: string };
  topic?: { _id: string; title: string };
  level?: string;
  imageUrl?: string;
  createdAt?: string;
}

export default function TeacherVocabularies() {
  const [searchParams] = useSearchParams();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLesson, setFilterLesson] = useState(searchParams.get('lesson') || '');
  const [filterTopic, setFilterTopic] = useState(searchParams.get('topic') || '');
  const [filterLevel, setFilterLevel] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Vocabulary>>({
    word: '',
    meaning: '',
    phonetic: '',
    pronunciationUS: '',
    pronunciationUK: '',
    partOfSpeech: 'noun',
    stress: '',
    example: '',
    exampleTranslation: '',
    synonyms: [],
    antonyms: [],
    lesson: undefined,
    topic: undefined,
    level: 'A1',
    imageUrl: ''
  });

  // Fetch topics when filterLesson changes
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (filterLesson) {
      fetchTopicsByLesson(filterLesson);
      // If topic param exists in URL, set it
      if (topicParam) {
        setFilterTopic(topicParam);
      }
    } else {
      setTopics([]);
      if (!topicParam) {
        setFilterTopic(''); // Reset topic filter when lesson is cleared (unless topic param exists)
      }
    }
  }, [filterLesson, searchParams]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterLesson, filterTopic, filterLevel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterLesson) params.append('lesson', filterLesson);
      if (filterTopic) params.append('topic', filterTopic);
      if (filterLevel) params.append('level', filterLevel);
      
      const [vocabsRes, lessonsRes] = await Promise.all([
        api.get(`/api/vocab?${params.toString()}`),
        api.get('/api/lessons')
      ]);
      
      setVocabularies(vocabsRes.data.vocabs || vocabsRes.data);
      setLessons(lessonsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all topics
  const fetchAllTopics = async () => {
    try {
      const response = await api.get('/api/topics');
      setTopics(response.data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    }
  };

  // Fetch topics when lesson is selected
  const fetchTopicsByLesson = async (lessonId: string) => {
    if (!lessonId) {
      setTopics([]);
      return;
    }
    
    try {
      const response = await api.get(`/api/topics/${lessonId}`);
      setTopics(response.data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    }
  };
  
  // Handle lesson change in form
  const handleLessonChange = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setFormData(prev => ({ ...prev, lesson: lessonId as any, topic: undefined }));
    // Filter topics by lesson to ensure they match
    if (lessonId) {
      fetchTopicsByLesson(lessonId);
    } else {
      fetchAllTopics();
    }
  };

  const handleOpenModal = async (vocab?: Vocabulary) => {
    // Always fetch all topics when opening modal
    await fetchAllTopics();
    
    if (vocab) {
      setEditingVocab(vocab);
      const lessonId = vocab.lesson?._id || '';
      const topicId = vocab.topic?._id || '';
      
      setSelectedLesson(lessonId);
      
      // Load topics for the lesson if lesson exists
      if (lessonId) {
        await fetchTopicsByLesson(lessonId);
      }
      
      setFormData({
        word: vocab.word,
        meaning: vocab.meaning,
        phonetic: vocab.phonetic || '',
        pronunciationUS: vocab.pronunciationUS || '',
        pronunciationUK: vocab.pronunciationUK || '',
        partOfSpeech: vocab.partOfSpeech || 'noun',
        stress: vocab.stress || '',
        example: vocab.example || '',
        exampleTranslation: vocab.exampleTranslation || '',
        synonyms: vocab.synonyms || [],
        antonyms: vocab.antonyms || [],
        lesson: lessonId as any,
        topic: topicId as any,
        level: vocab.level || 'A1',
        imageUrl: vocab.imageUrl || ''
      });
    } else {
      setEditingVocab(null);
      setSelectedLesson('');
      setFormData({
        word: '',
        meaning: '',
        phonetic: '',
        pronunciationUS: '',
        pronunciationUK: '',
        partOfSpeech: 'noun',
        stress: '',
        example: '',
        exampleTranslation: '',
        synonyms: [],
        antonyms: [],
        lesson: undefined,
        topic: undefined,
        level: 'A1',
        imageUrl: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // If topic is selected, get its lessonId and include both in payload
      let lessonId: string | undefined = formData.lesson as string || selectedLesson || undefined;
      if (formData.topic && !lessonId) {
        // Find topic in topics list to get its lessonId
        const selectedTopic = topics.find(t => t._id === formData.topic);
        if (selectedTopic && selectedTopic.lessonId) {
          lessonId = typeof selectedTopic.lessonId === 'object' 
            ? selectedTopic.lessonId._id 
            : selectedTopic.lessonId;
        }
      }

      const submitData: any = { ...formData };
      // Include both lesson and topic if available
      if (lessonId) {
        submitData.lesson = lessonId;
      }
      if (formData.topic) {
        submitData.topic = formData.topic;
      }

      if (editingVocab) {
        // Update
        await api.put(`/api/vocab/${editingVocab._id}`, submitData);
        alert('✅ Cập nhật từ vựng thành công!');
      } else {
        // Create
        await api.post('/api/vocab', submitData);
        alert('✅ Tạo từ vựng mới thành công!');
      }
      
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save vocabulary:', err);
      alert('Không thể lưu từ vựng. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa từ vựng này?')) return;
    
    try {
      await api.delete(`/api/vocab/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete vocabulary:', err);
      alert('Không thể xóa từ vựng. Vui lòng thử lại.');
    }
  };

  const handleArrayInput = (field: 'synonyms' | 'antonyms', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

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
            <BookOpen className="text-green-600" size={32} />
            Quản lý Từ vựng
          </h1>
          <p className="text-gray-500 mt-1">Thêm và quản lý từ vựng cho bài học</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg"
        >
          <Plus size={20} />
          Thêm từ vựng mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm từ vựng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterLesson}
            onChange={(e) => {
              setFilterLesson(e.target.value);
              setFilterTopic(''); // Reset topic when lesson changes
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Tất cả bài học</option>
            {lessons.map(lesson => (
              <option key={lesson._id} value={lesson._id}>{lesson.title}</option>
            ))}
          </select>

          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            disabled={!filterLesson}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{filterLesson ? 'Tất cả chủ đề' : 'Vui lòng chọn bài học trước'}</option>
            {topics.map(topic => (
              <option key={topic._id} value={topic._id}>{topic.title}</option>
            ))}
          </select>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Tất cả cấp độ</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterLesson('');
              setFilterTopic('');
              setFilterLevel('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Từ vựng
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nghĩa
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Phiên âm
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Loại từ
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bài học
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cấp độ
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vocabularies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <BookOpen className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="text-lg">Chưa có từ vựng nào</p>
                    <p className="text-sm mt-1">Nhấn "Thêm từ vựng mới" để bắt đầu</p>
                  </td>
                </tr>
              ) : (
                vocabularies.map((vocab) => (
                  <tr key={vocab._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{vocab.word}</div>
                      {vocab.stress && <div className="text-xs text-gray-500 mt-1">{vocab.stress}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{vocab.meaning}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {vocab.phonetic && (
                          <span className="text-sm text-gray-600">{vocab.phonetic}</span>
                        )}
                        {(vocab.pronunciationUS || vocab.pronunciationUK) && (
                          <Volume2 className="text-green-600" size={16} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {vocab.partOfSpeech && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          {vocab.partOfSpeech}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {vocab.lesson?.title || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        {vocab.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(vocab)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(vocab._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingVocab ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                  title="Đóng"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Section: Bài học và Chủ đề */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-300">
                  {/* Lesson */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bài học
                    </label>
                    <select
                      value={formData.lesson as any || selectedLesson || ''}
                      onChange={(e) => handleLessonChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Chọn bài học</option>
                      {lessons.map(lesson => (
                        <option key={lesson._id} value={lesson._id}>{lesson.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chủ đề
                    </label>
                    <select
                      value={formData.topic as any || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value as any }))}
                      disabled={!selectedLesson && !formData.lesson}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">{selectedLesson || formData.lesson ? 'Chọn chủ đề' : 'Vui lòng chọn bài học trước'}</option>
                      {topics.map(topic => (
                        <option key={topic._id} value={topic._id}>{topic.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section: Thông tin cơ bản */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Word */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Từ vựng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.word}
                      onChange={(e) => setFormData(prev => ({ ...prev, word: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Hello"
                    />
                  </div>

                  {/* Meaning */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nghĩa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.meaning}
                      onChange={(e) => setFormData(prev => ({ ...prev, meaning: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Xin chào"
                    />
                  </div>
                </div>

                {/* Separator */}
                <div className="md:col-span-2 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-medium">PHÁT ÂM</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                {/* Phonetic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    value={formData.phonetic}
                    onChange={(e) => setFormData(prev => ({ ...prev, phonetic: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="/həˈləʊ/"
                  />
                </div>

                {/* Stress */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trọng âm
                  </label>
                  <input
                    type="text"
                    value={formData.stress}
                    onChange={(e) => setFormData(prev => ({ ...prev, stress: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="HEL-lo (1st syllable)"
                  />
                </div>

                {/* Pronunciation US */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phát âm US (URL hoặc text)
                  </label>
                  <input
                    type="text"
                    value={formData.pronunciationUS}
                    onChange={(e) => setFormData(prev => ({ ...prev, pronunciationUS: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/audio.mp3"
                  />
                </div>

                {/* Pronunciation UK */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phát âm UK (URL hoặc text)
                  </label>
                  <input
                    type="text"
                    value={formData.pronunciationUK}
                    onChange={(e) => setFormData(prev => ({ ...prev, pronunciationUK: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/audio.mp3"
                  />
                </div>

                {/* Separator */}
                <div className="md:col-span-2 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-medium">PHÂN LOẠI</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                {/* Part of Speech */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại từ
                  </label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={(e) => setFormData(prev => ({ ...prev, partOfSpeech: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="noun">Noun (Danh từ)</option>
                    <option value="verb">Verb (Động từ)</option>
                    <option value="adjective">Adjective (Tính từ)</option>
                    <option value="adverb">Adverb (Trạng từ)</option>
                    <option value="preposition">Preposition (Giới từ)</option>
                    <option value="conjunction">Conjunction (Liên từ)</option>
                    <option value="pronoun">Pronoun (Đại từ)</option>
                    <option value="interjection">Interjection (Thán từ)</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cấp độ
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>

                {/* Separator */}
                <div className="md:col-span-2 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-medium">VÍ DỤ</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                {/* Example */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ví dụ
                  </label>
                  <input
                    type="text"
                    value={formData.example}
                    onChange={(e) => setFormData(prev => ({ ...prev, example: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Hello, how are you?"
                  />
                </div>

                {/* Example Translation */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dịch ví dụ
                  </label>
                  <input
                    type="text"
                    value={formData.exampleTranslation}
                    onChange={(e) => setFormData(prev => ({ ...prev, exampleTranslation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Xin chào, bạn khỏe không?"
                  />
                </div>

                {/* Separator */}
                <div className="md:col-span-2 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-medium">TỪ LIÊN QUAN</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                {/* Synonyms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ đồng nghĩa (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={formData.synonyms?.join(', ')}
                    onChange={(e) => handleArrayInput('synonyms', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="hi, hey, greetings"
                  />
                </div>

                {/* Antonyms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ trái nghĩa (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={formData.antonyms?.join(', ')}
                    onChange={(e) => handleArrayInput('antonyms', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="goodbye, bye, farewell"
                  />
                </div>

                {/* Separator */}
                <div className="md:col-span-2 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-medium">KHÁC</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL hình ảnh
                  </label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
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
                  {editingVocab ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}





