import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Rank from "../models/Rank";
import Badge from "../models/Badge";

/**
 * 📈 Cập nhật tiến trình học (học viên)
 * Body: { points: number, completedLesson: boolean }
 */
export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { points = 0, completedLesson = false } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1️⃣ Cộng điểm và số bài học đã hoàn thành
    const rank = await Rank.findOneAndUpdate(
      { userId },
      {
        $inc: { points, completedLessons: completedLesson ? 1 : 0 },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // 2️⃣ Tự động tính lại level (1 level = 100 điểm)
    const newLevel = Math.floor(rank.points / 100) + 1;
    if (newLevel > rank.level) {
      rank.level = newLevel;
      await rank.save();
    }

    // 3️⃣ Cấp huy hiệu tự động dựa trên điểm
    const io = req.app.get("io");

    // Huy hiệu Rookie
    if (rank.points >= 100 && rank.points < 500) {
      await Badge.findOneAndUpdate(
        { name: "Rookie" },
        { $addToSet: { users: userId } },
        { upsert: true }
      );
      io.to(userId.toString()).emit("badge.earned", {
        name: "Rookie",
        message: "Chúc mừng bạn đã đạt cấp Rookie 🏅!",
      });
    }

    // Huy hiệu Master
    if (rank.points >= 500) {
      await Badge.findOneAndUpdate(
        { name: "Master" },
        { $addToSet: { users: userId } },
        { upsert: true }
      );
      io.to(userId.toString()).emit("badge.earned", {
        name: "Master",
        message: "Bạn đã trở thành Master 🥇!",
      });
    }

    // 4️⃣ Emit realtime cập nhật rank toàn hệ thống
    io.emit("rank.updated", {
      userId,
      points: rank.points,
      level: rank.level,
      completedLessons: rank.completedLessons,
    });

    return res.json({
      message: "Progress updated successfully",
      rank,
    });
  } catch (err) {
    console.error("updateProgress error:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 🏆 Lấy bảng xếp hạng học viên (top 20)
 */
export const getLeaderboard = async (_req: Request, res: Response) => {
  try {
    const leaderboard = await Rank.find()
      .populate("userId", "nickname email")
      .sort({ points: -1 })
      .limit(20)
      .lean();

    return res.json(leaderboard);
  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};
