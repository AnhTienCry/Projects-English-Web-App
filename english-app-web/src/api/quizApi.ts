import axios from './http';

export const getQuizzesByTopic = (topicId: string) =>
  axios.get(`/api/quizzes/topic/${topicId}`);

export const createQuiz = (data: any) => axios.post('/api/quizzes', data);

export const deleteQuiz = (id: string) => axios.delete(`/api/quizzes/${id}`);
