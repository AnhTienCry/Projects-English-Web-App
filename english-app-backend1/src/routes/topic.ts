import express from "express";
import {
  getTopicById,
  getAllTopics,
  getTopicsByLesson,
  createTopic,
  updateTopic,
  deleteTopic,
  togglePublish,
} from "../controllers/topicController";
import { authMiddleware, isTeacher, allowTeacherOrAdmin } from "../middleware/auth";

const router = express.Router();

/* ---------- Public / Student ---------- */
// 👩‍🎓 Lấy 1 topic theo ID (phải đặt trước /:lessonId để tránh conflict)
router.get("/detail/:id", authMiddleware, getTopicById);

// 👩‍🎓 Lấy tất cả topics (phải đặt trước /:lessonId để tránh conflict)
router.get("/", authMiddleware, getAllTopics);

// 👩‍🎓 Học viên có thể xem danh sách topic theo bài học
router.get("/:lessonId", authMiddleware, getTopicsByLesson);

/* ---------- Teacher & Admin ---------- */
// 👨‍🏫 Tạo mới topic (Admin hoặc Teacher)
router.post("/", authMiddleware, allowTeacherOrAdmin, createTopic);

// 👨‍🏫 Cập nhật topic (Admin hoặc Teacher)
router.put("/:id", authMiddleware, allowTeacherOrAdmin, updateTopic);

// 👑 Admin hoặc giảng viên xóa topic
router.delete("/:id", authMiddleware, allowTeacherOrAdmin, deleteTopic);

// 👑 Admin hoặc giảng viên đổi trạng thái xuất bản
router.patch("/:id/publish", authMiddleware, allowTeacherOrAdmin, togglePublish);

export default router;
