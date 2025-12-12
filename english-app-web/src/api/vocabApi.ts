import api from "./http";

export const getVocabByTopic = (topicId: string) =>
  api.get(`/api/vocab/topic/${topicId}`);

export const getVocabsByLesson = (lessonId: string) =>
  api.get(`/api/vocab/lesson/${lessonId}`);

export const createVocab = (data: any) =>
  api.post("/api/vocab", data);

export const deleteVocab = (id: string) =>
  api.delete(`/api/vocab/${id}`);

export const bulkCreateVocab = (data: any[]) =>
  api.post("/api/vocab/bulk", data); // ✅ Dùng "api", không phải axios
