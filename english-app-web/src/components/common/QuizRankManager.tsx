import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Edit2, Trash2, Save, Trophy, BookOpen, Layers, Search } from 'lucide-react';
import api from '../../api/http';
import { getAllLessons, getTopicsByLesson } from '../../api/lessonsApi';
import { getQuizzesByTopic } from '../../api/quizApi';
import { useAuth } from '../../contexts/AuthContext';

interface Quiz {
  _id: string;
  question?: string;
  title?: string;
  isActive?: boolean;
}

interface Lesson {
  _id: string;
  title: string;
}

const LOCAL_KEY = 'quizRankSelections';

const QuizRankManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  const [selected, setSelected] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string>('');
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState<string>('');
  const [sourceLessons, setSourceLessons] = useState<Lesson[]>([]);
  const [sourceLessonId, setSourceLessonId] = useState<string>('');
  const [topics, setTopics] = useState<Array<{ _id: string; title?: string }>>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [topicQuizzes, setTopicQuizzes] = useState<Quiz[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await api.get('/api/quizzes').catch(() => ({ data: [] }));
      const data = res?.data || [];
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const fetchLessons = useCallback(async () => {
    try {
      const resp = await api.get('/api/quiz-rank/lessons').catch(() => ({ data: [] }));
      const data = resp?.data || [];
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load lessons', err);
    }
  }, []);

  const fetchSourceLessons = useCallback(async () => {
    try {
      const resp = await getAllLessons().catch(() => ({ data: [] }));
      const data = resp?.data || [];
      setSourceLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load source lessons', err);
    }
  }, []);

  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading) {
      fetchLessons();
      fetchSourceLessons();
    }
  }, [authLoading, fetchLessons, fetchSourceLessons]);

  const fetchTopicsForSource = async (lessonId: string) => {
    setTopics([]);
    setSelectedTopicId('');
    setTopicQuizzes([]);
    if (!lessonId) return;
    try {
      const resp = await getTopicsByLesson(lessonId).catch(() => ({ data: [] }));
      const data = resp?.data || [];
      setTopics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch topics', err);
    }
  };

  const fetchQuizzesByTopic = async (topicId: string) => {
    setTopicQuizzes([]);
    if (!topicId) return;
    try {
      const resp = await getQuizzesByTopic(topicId).catch(() => ({ data: [] }));
      const data = resp?.data || [];
      const list = Array.isArray(data) ? data : [];
      setTopicQuizzes(list);
      if (list.length) {
        setQuizzes(prev => {
          const map = new Map(prev.map(q => [q._id, q]));
          list.forEach((q: Quiz) => map.set(q._id, q));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to fetch quizzes for topic', err);
    }
  };

  const createLesson = async () => {
    if (!newLessonTitle.trim()) {
      alert('Vui lòng nhập tiêu đề bài học');
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Vui lòng đăng nhập trước khi tạo bài học.');
      return;
    }
    try {
      const { data: created } = await api.post('/api/quiz-rank/lessons', {
        title: newLessonTitle.trim(),
        quizzes: selected,
      });
      setLessons(prev => [created, ...prev]);
      setCurrentLessonId(created._id);
      setEditingLessonId(created._id);
      setEditingLessonTitle(created.title || '');
      const maybeQuizzes = (created as unknown as { quizzes?: Quiz[] }).quizzes;
      if (Array.isArray(maybeQuizzes) && maybeQuizzes.length) {
        const createdQuizzes: Quiz[] = maybeQuizzes;
        setQuizzes(prev => {
          const map = new Map(prev.map(q => [q._id, q]));
          createdQuizzes.forEach(q => map.set(q._id, q));
          return Array.from(map.values());
        });
        setSelected(createdQuizzes.map(q => q._id));
      }
      setNewLessonTitle('');
      alert('Tạo bài học thành công');
    } catch (err: unknown) {
      console.error('createLesson failed:', err);
      alert('Tạo bài học thất bại: ' + ((err as Error).message || ''));
    }
  };

  const saveLessonTitle = async (lessonId: string, title: string) => {
    if (!title.trim()) {
      alert('Tiêu đề không được rỗng');
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Vui lòng đăng nhập để sửa bài học.');
      return;
    }
    try {
      const { data: updated } = await api.put(`/api/quiz-rank/lessons/${lessonId}`, { title: title.trim() });
      setLessons(prev => prev.map(l => (l._id === lessonId ? updated : l)));
      setEditingLessonId(null);
      setEditingLessonTitle('');
      alert('Cập nhật bài học thành công');
    } catch (err: unknown) {
      alert('Cập nhật thất bại: ' + ((err as Error).message || ''));
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài học này?')) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Vui lòng đăng nhập để xóa bài học.');
      return;
    }
    try {
      const resp = await api.delete(`/api/quiz-rank/lessons/${lessonId}`).catch((e) => e.response || { status: 500 });
      if (resp.status === 404) {
        alert('Bài học không tồn tại trên server. Đã xóa cục bộ.');
      } else if (resp.status && resp.status >= 400 && resp.status !== 204) {
        const txt = resp.data || '';
        console.error('Delete lesson failed', resp.status, txt);
        throw new Error(`Server returned ${resp.status}`);
      }
      setLessons(prev => prev.filter(l => l._id !== lessonId));
      if (currentLessonId === lessonId) {
        setCurrentLessonId('');
        setSelected([]);
      }
      alert('Đã xóa bài học');
    } catch (err: unknown) {
      alert('Xóa thất bại: ' + ((err as Error).message || ''));
    }
  };

  const handleLessonSelect = async (lessonId: string) => {
    setCurrentLessonId(lessonId);
    try {
      const tokenCheck = localStorage.getItem('accessToken');
      if (!tokenCheck) {
        setSelected([]);
        return;
      }
      if (lessonId) {
        const resp = await api.get(`/api/quiz-rank?lessonId=${lessonId}`).catch(() => ({ data: null }));
        const body = resp?.data;
        if (Array.isArray(body?.quizzes) && body.quizzes.length) {
          const incoming: Quiz[] = body.quizzes;
          setQuizzes(prev => {
            const map = new Map(prev.map(q => [q._id, q]));
            incoming.forEach(q => map.set(q._id, q));
            return Array.from(map.values());
          });
          if (Array.isArray(body.selections) && body.selections.length) {
            setSelected(body.selections as string[]);
          } else {
            setSelected(incoming.map(q => q._id));
          }
          return;
        }
        if (Array.isArray(body?.selections)) {
          setSelected(body.selections as string[]);
          return;
        }
        setSelected([]);
        return;
      }

      const resp = await api.get('/api/quiz-rank').catch(() => ({ data: null }));
      const body = resp?.data;
      if (Array.isArray(body?.quizzes)) {
        const ids = body.quizzes
          .map((q: unknown) => (typeof q === 'string' ? q : (q as { _id?: string })._id))
          .filter(Boolean) as string[];
        setSelected(ids);
        return;
      }
      setSelected([]);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const resp = await api.get('/api/quiz-rank').catch(() => ({ data: null }));
        const body = resp?.data;
        if (Array.isArray(body?.quizzes)) {
          const ids = body.quizzes
            .map((q: unknown) => (typeof q === 'string' ? q : (q as { _id?: string })._id))
            .filter(Boolean) as string[];
          setSelected(ids);
          return;
        }
      } catch {
        // ignore
      }
    };

    if (authLoading) return;
    loadSaved();
  }, [authLoading]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(selected));
    } catch (err: unknown) {
      console.warn('Failed to persist quiz rank selections', err);
    }
  }, [selected]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const removeAt = (index: number) => {
    setSelected(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const tokenCheck = localStorage.getItem('accessToken');
    if (!tokenCheck) {
      alert('Vui lòng đăng nhập trước khi lưu.');
      return;
    }
    try {
      if (currentLessonId) {
        await api.put(`/api/quiz-rank/lessons/${currentLessonId}`, { quizzes: selected });
      } else {
        await api.put('/api/quiz-rank', { quizzes: selected });
      }
      alert('Lưu thành công');
    } catch (err: unknown) {
      alert('Lưu thất bại: ' + ((err as Error).message || ''));
    }
  };

  const handleClearSaved = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa cấu hình Quiz Rank đã lưu trên server không?')) return;
    const tokenCheck = localStorage.getItem('accessToken');
    if (!tokenCheck) {
      alert('Vui lòng đăng nhập để xóa cấu hình trên server.');
      return;
    }
    try {
      if (currentLessonId) {
        await api.put(`/api/quiz-rank/lessons/${currentLessonId}`, { quizzes: [] });
      } else {
        await api.put('/api/quiz-rank', { quizzes: [] });
      }
      setSelected([]);
      localStorage.removeItem(LOCAL_KEY);
      alert('Đã xóa cấu hình trên server.');
    } catch (err: unknown) {
      alert('Xóa thất bại: ' + ((err as Error).message || ''));
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const filteredTopicQuizzes = topicQuizzes.filter(q => 
    (q.question || q.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý Quiz Rank</h1>
        </div>
        <p className="text-gray-600">Sắp xếp và quản lý thứ tự quiz cho chế độ Rank</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lesson Management & Import */}
        <div className="lg:col-span-1 space-y-6">
          {/* Lesson Management */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Bài học Quiz Rank</h2>
            </div>
            
            <select
              value={currentLessonId}
              onChange={(e) => handleLessonSelect(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Chọn bài học --</option>
              {lessons.map(l => (
                <option key={l._id} value={l._id}>{l.title}</option>
              ))}
            </select>

            <div className="flex gap-2 mb-3">
              <input
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Tên bài học mới"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                onKeyPress={(e) => e.key === 'Enter' && createLesson()}
              />
              <button 
                onClick={createLesson} 
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo
              </button>
            </div>

            {currentLessonId && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    const lesson = lessons.find(l => l._id === currentLessonId);
                    if (lesson) {
                      setEditingLessonId(lesson._id);
                      setEditingLessonTitle(lesson.title || '');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Sửa
                </button>
                <button
                  onClick={() => deleteLesson(currentLessonId)}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            )}

            {editingLessonId && (
              <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  value={editingLessonTitle}
                  onChange={(e) => setEditingLessonTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && saveLessonTitle(editingLessonId, editingLessonTitle)}
                />
                <button
                  onClick={() => saveLessonTitle(editingLessonId, editingLessonTitle)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                >
                  OK
                </button>
                <button
                  onClick={() => { setEditingLessonId(null); setEditingLessonTitle(''); }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          {/* Import from Topic */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">Nhập từ Topic</h2>
            </div>
            
            <select
              value={sourceLessonId}
              onChange={(e) => { setSourceLessonId(e.target.value); fetchTopicsForSource(e.target.value); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- Chọn Lesson --</option>
              {sourceLessons.map(s => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>

            <select
              value={selectedTopicId}
              onChange={(e) => { setSelectedTopicId(e.target.value); fetchQuizzesByTopic(e.target.value); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- Chọn Topic --</option>
              {topics.map(t => (
                <option key={t._id} value={t._id}>{t.title || 'Untitled'}</option>
              ))}
            </select>

            {topicQuizzes.length > 0 && (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm quiz..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="max-h-64 overflow-auto space-y-2">
                  {filteredTopicQuizzes.map(q => (
                    <div
                      key={q._id}
                      onClick={() => toggleSelect(q._id)}
                      className={`p-3 border rounded-lg text-sm cursor-pointer transition-all ${
                        selected.includes(q._id) 
                          ? 'bg-green-50 border-green-300 shadow-sm' 
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-gray-800">{q.question || q.title || 'Untitled'}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Selected Quiz Rank */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Danh sách Quiz đã chọn ({selected.length})
                </h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Lưu
                </button>
                {isAdmin && (
                  <button 
                    onClick={handleClearSaved} 
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-all"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {selected.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Chưa chọn quiz nào</p>
                <p className="text-sm mt-1">Chọn quiz từ Topic hoặc thêm thủ công</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {selected.map((id, idx) => {
                  const quiz = quizzes.find(q => q._id === id);
                  return (
                    <div 
                      key={id} 
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="flex-1 truncate text-sm font-medium text-gray-800">
                          {quiz ? (quiz.question || quiz.title || 'Untitled') : id}
                        </span>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button 
                          onClick={() => removeAt(idx)} 
                          className="p-2 border border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all"
                          title="Xóa"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRankManager;
