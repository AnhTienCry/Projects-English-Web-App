import express from "express";
import {
  getAllTowerLevels,
  getTowerLevelById,
  createTowerLevel,
  updateTowerLevel,
  deleteTowerLevel,
  addQuestionsToTowerLevel,
  removeQuestionFromTowerLevel,
  getQuizBank,
  completeTowerChallenge,
  // mới
  getTowerLevelByNumber,
  getUserTowerProgress,
} from "../controllers/towerController";
import { authMiddleware, allowStudentOnly, allowTeacherOrAdmin } from "../middleware/auth";

const router = express.Router();

/** ⚠️ Các route “cụ thể” phải đứng TRƯỚC `/:id` */

// Teacher/Admin: Lấy ngân hàng quiz
router.get("/quiz-bank", authMiddleware, allowTeacherOrAdmin, getQuizBank);

// NEW: Progress theo user (trả locked/unlocked, completed,…)
router.get("/progress/me", authMiddleware, getUserTowerProgress);

// NEW: Lấy level theo số thứ tự (Flutter dùng fetchTowerByNumber)
router.get("/by-number/:levelNumber", getTowerLevelByNumber);

// Public: Danh sách tầng
router.get("/", getAllTowerLevels);

// Auth required: Chi tiết 1 tầng (đã chuẩn hóa trả thêm `questions`)
router.get("/:id", authMiddleware, getTowerLevelById);

// Teacher/Admin: Quản lý tầng
router.post("/", authMiddleware, allowTeacherOrAdmin, createTowerLevel);
router.put("/:id", authMiddleware, allowTeacherOrAdmin, updateTowerLevel);
router.delete("/:id", authMiddleware, allowTeacherOrAdmin, deleteTowerLevel);

// Teacher/Admin: Quản lý quiz trong tầng
router.post("/:id/questions", authMiddleware, allowTeacherOrAdmin, addQuestionsToTowerLevel);
router.delete("/:id/questions/:quizId", authMiddleware, allowTeacherOrAdmin, removeQuestionFromTowerLevel);

// Student: Submit kết quả leo tháp → server trả kèm progress mới
router.post("/complete", authMiddleware, allowStudentOnly, completeTowerChallenge);

export default router;
