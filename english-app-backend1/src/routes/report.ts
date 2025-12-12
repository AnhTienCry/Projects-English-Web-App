import express from "express";
import {
  getAdminReport,
  getTeacherReport,
  getStudentProgress,
  getStudentProgressSelf,
  getTeacherStudents,
} from "../controllers/reportController";
import { authMiddleware, isAdmin, isTeacher } from "../middleware/auth";

const router = express.Router();

/**
 * 👑 ADMIN
 * - Xem thống kê tổng thể hệ thống
 */
router.get("/admin", authMiddleware, isAdmin, getAdminReport);
router.get("/overview", authMiddleware, isAdmin, getAdminReport);

/**
 * 👩‍🏫 TEACHER
 * - Xem báo cáo của lớp học, học viên
 */
router.get("/teacher", authMiddleware, isTeacher, getTeacherReport);
router.get("/progress/all", authMiddleware, isTeacher, getTeacherReport);
router.get("/teacher/progress", authMiddleware, isTeacher, getTeacherReport);
router.get("/teacher/students", authMiddleware, isTeacher, getTeacherStudents);
router.get("/students", authMiddleware, isTeacher, getTeacherStudents); // Alias for frontend
router.get("/progress/users/:userId", authMiddleware, isTeacher, getStudentProgress);
router.get("/student/:id", authMiddleware, isTeacher, getStudentProgress);

/**
 * 👨‍🎓 STUDENT
 * - Xem tiến trình học của chính mình
 */
router.get("/me", authMiddleware, getStudentProgressSelf);

export default router;
