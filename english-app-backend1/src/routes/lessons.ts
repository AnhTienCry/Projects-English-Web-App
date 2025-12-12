import express from "express";
import { 
  getAllLessons,
  getPublishedLessons,
  getUnpublishedLessons,
  getLessonById, 
  createLesson, 
  updateLesson, 
  deleteLesson,
  submitLessonResult,
  getUserProgress,
  getUserProgressWithLessons,
  publishLesson,
  getLeaderboard
} from "../controllers/lessonsController";

import { 
  authMiddleware, 
  isTeacher, 
  isStudent, 
  allowTeacherOrAdmin 
} from "../middleware/auth";

const router = express.Router();

/* ---------- Public ---------- */
router.get("/published", getPublishedLessons);
router.get("/unpublished", getUnpublishedLessons);
router.get("/leaderboard", getLeaderboard);

/* ---------- Student ---------- */
router.get("/progress/user", authMiddleware, isStudent, getUserProgress);
router.get("/progress/me", authMiddleware, getUserProgressWithLessons);
router.post("/:id/submit", authMiddleware, isStudent, submitLessonResult);

/* ---------- Teacher & Admin ---------- */
router.post("/", authMiddleware, allowTeacherOrAdmin, createLesson);
router.put("/:id", authMiddleware, allowTeacherOrAdmin, updateLesson);
router.delete("/:id", authMiddleware, allowTeacherOrAdmin, deleteLesson);
router.patch("/:id/publish", authMiddleware, allowTeacherOrAdmin, publishLesson);
router.get("/admin/all", authMiddleware, getAllLessons);

/* ---------- General ---------- */
router.get("/", authMiddleware, getAllLessons);
router.get("/:id", authMiddleware, getLessonById);

export default router;
