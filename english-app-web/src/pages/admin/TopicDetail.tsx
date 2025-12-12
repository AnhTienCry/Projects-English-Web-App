import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookMarked, Brain, Video, FileText, ArrowRight } from 'lucide-react';
import { getVocabByTopic } from '../../api/vocabApi';
import { getQuizzesByTopic } from '../../api/quizApi';
import { getStoryByTopicId } from '../../api/storyAPI';
import api from '../../api/http';
import VocabTab from '../../components/vocab/VocabTab';
import QuizTab from '../../components/quiz/QuizTab';
import VideoTab from '../../components/video/VideoTab';
import StoryTab from '../../components/story/StoryTab';

const AdminTopicDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<any>(null);
  const [tab, setTab] = useState<'vocab' | 'quiz' | 'video' | 'story'>('vocab');
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [quizList, setQuizList] = useState<any[]>([]);
  const [videoList, setVideoList] = useState<any[]>([]);
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchTopic();
      fetchVocab();
      fetchQuiz();
      fetchVideo();
      fetchStory();
    }
  }, [id]);

  const fetchTopic = async () => {
    try {
      const response = await api.get(`/api/topics/detail/${id}`);
      setTopic(response.data);
    } catch (err) {
      console.error('fetchTopic error', err);
      setTopic({ title: 'Chi tiết chủ đề', description: 'Thông tin chủ đề học' });
    }
  };

  const fetchVocab = async () => {
    try {
      setLoading(true);
      const res = await getVocabByTopic(id!);
      setVocabList(res.data);
    } catch (err) {
      console.error('fetchVocab error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await getQuizzesByTopic(id!);
      setQuizList(res.data);
    } catch (err) {
      console.error('fetchQuiz error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/videos/topic/${id}`);
      setVideoList(res.data || []);
    } catch (err) {
      console.error('fetchVideo error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStory = async () => {
    try {
      setLoading(true);
      const res = await getStoryByTopicId(id!);
      setStory(res.data || null);
    } catch (err) {
      console.error('fetchStory error', err);
      setStory(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">📘 {topic?.title || 'Chi tiết chủ đề'}</h1>
          <p className="text-gray-500">{topic?.description || 'Thông tin chủ đề học'}</p>
          {topic?.lessonId && typeof topic.lessonId === 'object' && (
            <p className="text-sm text-gray-400 mt-1">
              Bài học: {topic.lessonId.title} (Level {topic.lessonId.level})
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
        >
          ⬅ Quay lại
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          🧩 Quản lý theo cấu trúc: Bài học → Chủ đề (Topic) → Từ vựng, Quiz, Video, Story.
        </p>
      </div>

      {/* Tabs - 4 tabs like modal "Công cụ cũ" */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTab('vocab')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            tab === 'vocab'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BookMarked size={18} />
          Từ vựng
        </button>
        <button
          onClick={() => setTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            tab === 'quiz'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Brain size={18} />
          Quiz
        </button>
        <button
          onClick={() => setTab('video')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            tab === 'video'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Video size={18} />
          Video
        </button>
        <button
          onClick={() => setTab('story')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            tab === 'story'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText size={18} />
          Truyện chêm
        </button>
      </div>

      {/* Nội dung */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        <>
          {tab === 'vocab' && (
            <VocabTab topicId={id!} vocabList={vocabList} refresh={fetchVocab} />
          )}
          {tab === 'quiz' && (
            <QuizTab topicId={id!} quizList={quizList} refresh={fetchQuiz} />
          )}
          {tab === 'video' && (
            <VideoTab topicId={id!} videoList={videoList} refresh={fetchVideo} />
          )}
          {tab === 'story' && (
            <StoryTab topicId={id!} story={story} refresh={fetchStory} />
          )}
        </>
      )}
    </div>
  );
};

export default AdminTopicDetail;




