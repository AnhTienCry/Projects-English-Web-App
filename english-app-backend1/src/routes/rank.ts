import express from "express";
import { updateProgress, getLeaderboard } from "../controllers/rankController";
import { authMiddleware, isStudent, AuthRequest } from "../middleware/auth";
import Rank from "../models/Rank";

const router = express.Router();

// Lấy rank của user hiện tại
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let rank = await Rank.findOne({ userId });
    
    // Nếu chưa có rank, tạo mới
    if (!rank) {
      rank = await Rank.create({
        userId,
        points: 0,
        level: 1,
        completedLessons: 0
      });
    }

    res.json(rank);
  } catch (err) {
    console.error("Get my rank error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Cập nhật tiến trình học viên (cộng điểm, hoàn thành bài học)
router.post("/progress", authMiddleware, isStudent, updateProgress);

// Bảng xếp hạng học viên
router.get("/", authMiddleware, getLeaderboard);
router.get("/leaderboard", authMiddleware, getLeaderboard);
router.get("/top", authMiddleware, getLeaderboard);

export default router;
