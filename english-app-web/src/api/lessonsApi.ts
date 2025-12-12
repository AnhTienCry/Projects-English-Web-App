import axios from './http';

export const getAllLessons = () => axios.get('/api/lessons');

export const getLessonById = (id: string) => axios.get(`/api/lessons/${id}`);

export const createLesson = (data: any) => axios.post('/api/lessons', data);

export const updateLesson = (id: string, data: any) => axios.put(`/api/lessons/${id}`, data);

export const deleteLesson = (id: string) => axios.delete(`/api/lessons/${id}`);

export const publishLesson = (id: string, value: boolean) =>
  axios.patch(`/api/lessons/${id}/publish?value=${value}`);

export const getTopicsByLesson = (lessonId: string) =>
  axios.get(`/api/topics/${lessonId}`);