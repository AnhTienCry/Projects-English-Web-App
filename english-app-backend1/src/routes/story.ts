import express from 'express';
import { storyController } from '../controllers/storycontroller';
import { authMiddleware, allowTeacherOrAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * === CHO TRANG ADMIN: LẤY TẤT CẢ TRUYỆN ===
 * GET /api/stories
 */
router.get(
  '/',
  authMiddleware,
  allowTeacherOrAdmin, // Chỉ Teacher/Admin
  storyController.getAllStories
);

/**
 * === CHO APP FLUTTER (người dùng đã đăng nhập): LẤY TRUYỆN THEO LESSON ===
 * GET /api/stories/lesson/:lessonId
 */
router.get(
  '/lesson/:lessonId',
  authMiddleware, // bất kỳ ai đăng nhập cũng xem được truyện
  storyController.getStoryByLessonId
);

/**
 * === CHO APP FLUTTER (người dùng đã đăng nhập): LẤY TRUYỆN THEO TOPIC ===
 * GET /api/stories/topic/:topicId
 */
router.get(
  '/topic/:topicId',
  authMiddleware, // bất kỳ ai đăng nhập cũng xem được truyện
  storyController.getStoryByTopicId
);

/**
 * === CHO TRANG ADMIN: TẠO TRUYỆN MỚI CHO 1 LESSON (CHỈ 1 LẦN DUY NHẤT) ===
 * POST /api/stories/lesson/:lessonId
 */
router.post(
  '/lesson/:lessonId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được thêm
  storyController.createStoryForLesson
);

/**
 * === CHO TRANG ADMIN: TẠO TRUYỆN MỚI CHO 1 TOPIC (CHỈ 1 LẦN DUY NHẤT) ===
 * POST /api/stories/topic/:topicId
 */
router.post(
  '/topic/:topicId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được thêm
  storyController.createStoryForTopic
);

/**
 * === CHO TRANG ADMIN: CẬP NHẬT TRUYỆN ===
 * PUT /api/stories/lesson/:lessonId
 */
router.put(
  '/lesson/:lessonId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được sửa
  storyController.updateStoryByLessonId
);

/**
 * === CHO TRANG ADMIN: CẬP NHẬT TRUYỆN THEO TOPIC ===
 * PUT /api/stories/topic/:topicId
 */
router.put(
  '/topic/:topicId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được sửa
  storyController.updateStoryByTopicId
);

/**
 * === CHO TRANG ADMIN: XÓA TRUYỆN ===
 * DELETE /api/stories/lesson/:lessonId
 */
router.delete(
  '/lesson/:lessonId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được xóa
  storyController.deleteStoryByLessonId
);

/**
 * === CHO TRANG ADMIN: XÓA TRUYỆN THEO TOPIC ===
 * DELETE /api/stories/topic/:topicId
 */
router.delete(
  '/topic/:topicId',
  authMiddleware,
  allowTeacherOrAdmin, // chỉ Admin/Teacher mới được xóa
  storyController.deleteStoryByTopicId
);

export default router;




