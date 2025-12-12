import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '../../api/http';

interface Lesson {
  _id: string;
  title: string;
  level: number;
}

interface Topic {
  _id: string;
  title: string;
  lessonId?: string | {
    _id: string;
    title: string;
    level?: number;
  };
}

interface Quiz {
  _id: string;
  lesson?: {
    _id: string;
    title: string;
  };
  topic?: {
    _id: string;
    title: string;
    lessonId?: string | {
      _id: string;
      title: string;
      level?: number;
    };
  };
  question?: string;
  title?: string;
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'matching';
  options?: string[];
  correctAnswer: string | string[];
  pairs?: { left: string; right: string }[];
  explanation?: string;
  timeLimit?: number;
  passingScore?: number;
  isActive: boolean;
}

interface CreateQuizModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editQuiz?: Quiz | null;
}

export default function CreateQuizModal({ onClose, onSuccess, editQuiz }: CreateQuizModalProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [formData, setFormData] = useState({
    lesson: '',
    topic: '',
    question: '',
    type: 'multiple_choice' as Quiz['type'],
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    timeLimit: 30,
    passingScore: 70,
    isActive: true,
    pairs: [{ left: '', right: '' }]
  });
  const [loading, setLoading] = useState(false);

  // Fetch lessons when modal opens
  useEffect(() => {
    fetchLessons();
    if (editQuiz) {
      // Try to get lessonId from quiz.lesson first
      let lessonId = editQuiz.lesson?._id || '';
      
      // If quiz doesn't have lesson but has topic, try to get lessonId from topic
      if (!lessonId && editQuiz.topic) {
        // First try from topic.lessonId (if populated from backend)
        if (editQuiz.topic.lessonId) {
          lessonId = typeof editQuiz.topic.lessonId === 'string' 
            ? editQuiz.topic.lessonId 
            : editQuiz.topic.lessonId._id || '';
        }
      }
      
      // Fetch topics for the lesson if lesson exists
      if (lessonId) {
        setSelectedLesson(lessonId);
        fetchTopicsByLesson(lessonId).then(() => {
          setFormData({
            lesson: lessonId,
            topic: editQuiz.topic?._id || '',
            question: editQuiz.question || '',
            type: editQuiz.type,
            options: editQuiz.options || ['', '', '', ''],
            correctAnswer: Array.isArray(editQuiz.correctAnswer) ? editQuiz.correctAnswer.join(', ') : editQuiz.correctAnswer,
            explanation: editQuiz.explanation || '',
            timeLimit: editQuiz.timeLimit || 30,
            passingScore: editQuiz.passingScore || 70,
            isActive: editQuiz.isActive,
            pairs: editQuiz.pairs && editQuiz.pairs.length > 0 ? editQuiz.pairs : [{ left: '', right: '' }]
          });
        });
      } else {
        // No lesson, fetch all topics
        fetchAllTopics();
        setFormData({
          lesson: '',
          topic: editQuiz.topic?._id || '',
          question: editQuiz.question || '',
          type: editQuiz.type,
          options: editQuiz.options || ['', '', '', ''],
          correctAnswer: Array.isArray(editQuiz.correctAnswer) ? editQuiz.correctAnswer.join(', ') : editQuiz.correctAnswer,
          explanation: editQuiz.explanation || '',
          timeLimit: editQuiz.timeLimit || 30,
          passingScore: editQuiz.passingScore || 70,
          isActive: editQuiz.isActive,
          pairs: editQuiz.pairs && editQuiz.pairs.length > 0 ? editQuiz.pairs : [{ left: '', right: '' }]
        });
      }
    } else {
      // Creating new quiz, fetch all topics initially (no lesson selected yet)
      fetchAllTopics();
    }
  }, [editQuiz]);

  const fetchLessons = async () => {
    try {
      const { data } = await api.get('/api/lessons');
      setLessons(data || []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  };
  
  const fetchAllTopics = async () => {
    try {
      const { data } = await api.get('/api/topics');
      setTopics(data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    }
  };
  
  const fetchTopicsByLesson = async (lessonId: string) => {
    if (!lessonId) {
      // If no lesson selected, show all topics
      fetchAllTopics();
      return;
    }
    
    try {
      const { data } = await api.get(`/api/topics/${lessonId}`);
      setTopics(data || []);
      return data || [];
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      // Fallback to all topics if fetch by lesson fails
      fetchAllTopics();
      return [];
    }
  };
  
  const handleLessonChange = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setFormData(prev => ({ ...prev, lesson: lessonId, topic: '' })); // Reset topic when lesson changes
    // Filter topics by lesson to ensure they match
    if (lessonId) {
      fetchTopicsByLesson(lessonId);
    } else {
      fetchAllTopics();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If topic is selected, get its lessonId and include both in payload
      let lessonId: string | undefined = formData.lesson || selectedLesson || undefined;
      if (formData.topic && !lessonId) {
        // Find topic in topics list to get its lessonId
        const selectedTopic = topics.find(t => t._id === formData.topic);
        if (selectedTopic && selectedTopic.lessonId) {
          lessonId = typeof selectedTopic.lessonId === 'object' 
            ? selectedTopic.lessonId._id 
            : selectedTopic.lessonId;
        }
      }

      const payload: any = {
        question: formData.question,
        type: formData.type,
        explanation: formData.explanation,
        timeLimit: formData.timeLimit,
        passingScore: formData.passingScore,
        isActive: formData.isActive,
      };

      // Include both lesson and topic if available
      if (lessonId) {
        payload.lesson = lessonId;
      }
      if (formData.topic) {
        payload.topic = formData.topic;
      }

      // Type-specific handling
      if (formData.type === 'multiple_choice') {
        payload.options = formData.options.filter(o => o.trim());
        payload.correctAnswer = formData.correctAnswer;
      } else if (formData.type === 'fill_blank') {
        payload.correctAnswer = formData.correctAnswer;
      } else if (formData.type === 'true_false') {
        payload.correctAnswer = formData.correctAnswer;
      } else if (formData.type === 'matching') {
        payload.pairs = formData.pairs.filter(p => p.left.trim() && p.right.trim());
        payload.correctAnswer = payload.pairs.map((p: any) => `${p.left}=${p.right}`).join('\n');
      }

      if (editQuiz) {
        await api.put(`/api/quizzes/${editQuiz._id}`, payload);
        alert('✅ Cập nhật quiz thành công!');
      } else {
        await api.post('/api/quizzes', payload);
        alert('✅ Tạo quiz mới thành công!');
      }
      
      onSuccess();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const addPair = () => {
    setFormData(prev => ({
      ...prev,
      pairs: [...prev.pairs, { left: '', right: '' }]
    }));
  };

  const removePair = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pairs: prev.pairs.filter((_, i) => i !== index)
    }));
  };

  const updatePair = (index: number, field: 'left' | 'right', value: string) => {
    setFormData(prev => ({
      ...prev,
      pairs: prev.pairs.map((pair, i) => 
        i === index ? { ...pair, [field]: value } : pair
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {editQuiz ? 'Chỉnh sửa Quiz' : 'Tạo Quiz mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Lesson and Topic */}
            <div className="grid grid-cols-2 gap-4">
              {/* Lesson */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bài học <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedLesson || formData.lesson}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Chọn bài học --</option>
                  {lessons.map(lesson => (
                    <option key={lesson._id} value={lesson._id}>
                      {lesson.title} (Level {lesson.level})
                    </option>
                  ))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  disabled={!selectedLesson && !formData.lesson}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn chủ đề --</option>
                  {topics.map(topic => (
                    <option key={topic._id} value={topic._id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
                {(!selectedLesson && !formData.lesson) && (
                  <p className="text-xs text-gray-500 mt-1">Vui lòng chọn bài học trước</p>
                )}
              </div>
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Câu hỏi <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Nhập câu hỏi..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại câu hỏi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Quiz['type'] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="multiple_choice">Multiple Choice (Trắc nghiệm)</option>
                <option value="fill_blank">Fill in the Blank (Điền từ)</option>
                <option value="true_false">True/False (Đúng/Sai)</option>
                <option value="matching">Matching (Ghép cặp)</option>
              </select>
            </div>

            {/* Type-specific fields */}
            {formData.type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Các lựa chọn
                </label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={`Lựa chọn ${index + 1}`}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                >
                  <Plus size={16} />
                  Thêm lựa chọn
                </button>
              </div>
            )}

            {formData.type === 'matching' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Các cặp ghép
                </label>
                {formData.pairs.map((pair, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => updatePair(index, 'left', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Từ tiếng Anh"
                    />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => updatePair(index, 'right', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Nghĩa tiếng Việt"
                    />
                    {formData.pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePair(index)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPair}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                >
                  <Plus size={16} />
                  Thêm cặp
                </button>
              </div>
            )}

            {/* Correct Answer */}
            {formData.type !== 'matching' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đáp án đúng <span className="text-red-500">*</span>
                </label>
                {formData.type === 'true_false' ? (
                  <select
                    required
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn đáp án --</option>
                    <option value="true">True (Đúng)</option>
                    <option value="false">False (Sai)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={formData.type === 'fill_blank' ? 'Nhập đáp án...' : 'Nhập đáp án chính xác...'}
                  />
                )}
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giải thích
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                placeholder="Giải thích đáp án..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian (giây)
                </label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min={5}
                  max={300}
                />
              </div>

              {/* Passing Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm đạt (%)
                </label>
                <input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, passingScore: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label className="text-sm text-gray-700">
                Kích hoạt quiz
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (editQuiz ? 'Đang cập nhật...' : 'Đang tạo...') : (editQuiz ? 'Cập nhật Quiz' : 'Tạo Quiz')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










