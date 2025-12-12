import axios from './http';

export const getTopicsByLesson = (lessonId: string) =>
  axios.get(`/api/topics/${lessonId}`);

export const createTopic = (data: any) =>
  axios.post('/api/topics', data);

export const deleteTopic = (id: string) =>
  axios.delete(`/api/topics/${id}`);
