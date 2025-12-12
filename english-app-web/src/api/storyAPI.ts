import api from "./http";

// Interface cho dữ liệu khi Tải lên / Cập nhật
interface StoryData {
  content: string;
  selectedVocabIds?: string[];
}

/**
 * Lấy TẤT CẢ truyện (cho trang Admin).
 */
export const getAllStories = () => 
  api.get('/api/stories');

/**
 * Lấy 1 truyện bằng lessonId (cho app Flutter & admin).
 */
export const getStoryByLessonId = (lessonId: string) => 
  api.get(`/api/stories/lesson/${lessonId}`);

/**
 * TẠO MỚI truyện (cho trang Admin).
 * ❗ Mỗi lesson chỉ được phép có 1 truyện, nếu đã tồn tại sẽ báo lỗi.
 */
export const createStoryByLessonId = (lessonId: string, data: StoryData) =>
  api.post(`/api/stories/lesson/${lessonId}`, data);

/**
 * CẬP NHẬT truyện (cho trang Admin).
 */
export const updateStoryByLessonId = (lessonId: string, data: StoryData) =>
  api.put(`/api/stories/lesson/${lessonId}`, data);

/**
 * XÓA 1 truyện bằng lessonId (cho trang Admin).
 */
export const deleteStoryByLessonId = (lessonId: string) =>
  api.delete(`/api/stories/lesson/${lessonId}`);

// ============ TOPIC-BASED API ============

/**
 * Lấy 1 truyện bằng topicId (cho app Flutter & admin).
 */
export const getStoryByTopicId = (topicId: string) => 
  api.get(`/api/stories/topic/${topicId}`);

/**
 * TẠO MỚI truyện cho topic (cho trang Admin).
 * ❗ Mỗi topic chỉ được phép có 1 truyện, nếu đã tồn tại sẽ báo lỗi.
 */
export const createStoryByTopicId = (topicId: string, data: StoryData) =>
  api.post(`/api/stories/topic/${topicId}`, data);

/**
 * CẬP NHẬT truyện theo topicId (cho trang Admin).
 */
export const updateStoryByTopicId = (topicId: string, data: StoryData) =>
  api.put(`/api/stories/topic/${topicId}`, data);

/**
 * XÓA 1 truyện bằng topicId (cho trang Admin).
 */
export const deleteStoryByTopicId = (topicId: string) =>
  api.delete(`/api/stories/topic/${topicId}`);




