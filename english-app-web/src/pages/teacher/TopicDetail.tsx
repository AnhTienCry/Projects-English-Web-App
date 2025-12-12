import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVocabByTopic } from '../../api/vocabApi';
import { getQuizzesByTopic } from '../../api/quizApi';
import VocabTab from '../../components/vocab/VocabTab';
import QuizTab from '../../components/quiz/QuizTab';

const TopicDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<any>(null);
  const [tab, setTab] = useState<'vocab' | 'quiz'>('vocab');
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [quizList, setQuizList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchTopic();
      fetchVocab();
      fetchQuiz();
    }
  }, [id]);

  const fetchTopic = () => {
    setTopic({ title: 'Chi tiết chủ đề', description: 'Thông tin chủ đề học' });
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            📘 {topic?.title}
          </h1>
          <p className="text-gray-500">{topic?.description}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
        >
          ⬅ Quay lại
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-4">
        <button
          onClick={() => setTab('vocab')}
          className={`pb-2 ${
            tab === 'vocab'
              ? 'border-b-2 border-blue-500 font-semibold'
              : 'text-gray-500'
          }`}
        >
          🅰️ Từ vựng
        </button>
        <button
          onClick={() => setTab('quiz')}
          className={`pb-2 ${
            tab === 'quiz'
              ? 'border-b-2 border-blue-500 font-semibold'
              : 'text-gray-500'
          }`}
        >
          🅱️ Câu hỏi
        </button>
      </div>

      {/* Nội dung */}
      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : tab === 'vocab' ? (
        <VocabTab topicId={id!} vocabList={vocabList} refresh={fetchVocab} />
      ) : (
        <QuizTab topicId={id!} quizList={quizList} refresh={fetchQuiz} />
      )}
    </div>
  );
};

export default TopicDetail;
