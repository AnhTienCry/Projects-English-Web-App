import { Request, Response } from "express";
import { Types } from "mongoose";
import TowerLevel, { ITowerLevel } from "../models/TowerLevel";
import Quiz from "../models/Quiz";
import UserProgress from "../models/UserProgress";
import Rank from "../models/Rank";
import Badge from "../models/Badge";
import { AuthRequest } from "../middleware/auth";

/* ============================================================
   Utility: processTowerCompletion (xuất ra để QuizController gọi)
============================================================ */
export async function processTowerCompletion(
  userId: string,
  levelId: string,
  passed: boolean,
  timeSpent: number = 0,
  appOrIo?: any
) {
  try {
    if (!passed) return { applied: false };

    const level = await TowerLevel.findById(levelId).lean<ITowerLevel | null>();
    if (!level) return { applied: false, reason: "level_not_found" };

    if (level.rewardPoints && level.rewardPoints > 0) {
      await Rank.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $inc: { points: level.rewardPoints } },
        { upsert: true }
      );
    }

    if (level.rewardBadge) {
      await Badge.findByIdAndUpdate(level.rewardBadge, { $addToSet: { users: userId } });
    }

    let userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (!userProgress) {
      userProgress = await UserProgress.create({
        userId: new Types.ObjectId(userId),
        totalScore: level.rewardPoints || 0,
        totalStudyTime: timeSpent || 0,
        completedTowerLevels: [String(level._id)],
        lastActiveDate: new Date(),
      } as any);
    } else {
      userProgress.totalScore = (userProgress.totalScore || 0) + (level.rewardPoints || 0);
      userProgress.totalStudyTime = (userProgress.totalStudyTime || 0) + (timeSpent || 0);
      userProgress.completedTowerLevels = userProgress.completedTowerLevels || [];
      const lid = String(level._id);
      if (!userProgress.completedTowerLevels.includes(lid)) userProgress.completedTowerLevels.push(lid);
      userProgress.lastActiveDate = new Date();
      await userProgress.save();
    }

    const io = appOrIo?.get ? appOrIo.get("io") : appOrIo;
    if (io) {
      io.to(userId.toString()).emit("tower.completed", {
        levelId: level._id,
        levelNumber: level.levelNumber,
        message: `Bạn đã vượt tầng ${level.levelNumber}!`,
        rewardPoints: level.rewardPoints || 0,
      });
    }

    return { applied: true };
  } catch (err) {
    console.error("processTowerCompletion error:", err);
    return { applied: false, error: err };
  }
}

/* ============================================================
   Helper: buildUserProgressPayload (lock/unlock state)
============================================================ */
async function buildUserProgressPayload(userId: string) {
  const levels = await TowerLevel.find()
    .sort({ levelNumber: 1 })
    .select("_id levelNumber title")
    .lean<ITowerLevel[]>();

  const up = await UserProgress.findOne({ userId: new Types.ObjectId(userId) }).lean() as any;
  const completed = new Set((up?.completedTowerLevels ?? []).map((x: string) => String(x)));

  // xác định tầng cao nhất đã hoàn thành liên tục
  const byNum = new Map(levels.map((l) => [l.levelNumber, l]));
  let highest = 0;
  for (let i = 1; ; i++) {
    const lv = byNum.get(i);
    if (!lv) break;
    if (completed.has(String(lv._id))) highest = i;
    else break;
  }

  const nextOpen = highest + 1;

  const items = levels.map((l) => ({
    id: String(l._id),
    title: l.title,
    levelNumber: l.levelNumber,
    locked: l.levelNumber > nextOpen,
  }));

  return {
    nextOpenLevelNumber: nextOpen,
    items,
    completedLevelIds: Array.from(completed),
  };
}

/* ============================================================
   CRUD Tower Levels (dành cho Admin)
============================================================ */
export async function getAllTowerLevels(_req: Request, res: Response) {
  try {
    const levels = await TowerLevel.find().sort({ levelNumber: 1 }).lean<ITowerLevel[]>();
    return res.json(levels);
  } catch (err) {
    console.error("getAllTowerLevels error:", err);
    return res.status(500).json({ message: "Failed to fetch tower levels" });
  }
}

export async function getTowerLevelById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const level = await TowerLevel.findById(id).populate("quizzes").lean<ITowerLevel | null>();
    if (!level) return res.status(404).json({ message: "Tower level not found" });
    const questions = Array.isArray((level as any).quizzes) ? (level as any).quizzes : [];
    return res.json({ ...level, id: String(level._id), questions });
  } catch (err) {
    console.error("getTowerLevelById error:", err);
    return res.status(500).json({ message: "Failed to fetch tower level" });
  }
}

export async function createTowerLevel(req: AuthRequest, res: Response) {
  try {
    const { levelNumber, title, description, rewardPoints, rewardBadge } = req.body;
    if (!levelNumber || !title) return res.status(400).json({ message: "levelNumber & title required" });

    const exists = await TowerLevel.findOne({ levelNumber });
    if (exists) return res.status(409).json({ message: "Level number already exists" });

    const newLevel = await TowerLevel.create({
      levelNumber,
      title,
      description,
      rewardPoints,
      rewardBadge,
      quizzes: [],
    });

    return res.status(201).json(newLevel);
  } catch (err) {
    console.error("createTowerLevel error:", err);
    return res.status(500).json({ message: "Failed to create tower level" });
  }
}

export async function updateTowerLevel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updated = await TowerLevel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Tower level not found" });
    return res.json({ message: "Tower level updated", level: updated });
  } catch (err) {
    console.error("updateTowerLevel error:", err);
    return res.status(500).json({ message: "Failed to update tower level" });
  }
}

export async function deleteTowerLevel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await TowerLevel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Tower level not found" });
    return res.json({ message: "Tower level deleted" });
  } catch (err) {
    console.error("deleteTowerLevel error:", err);
    return res.status(500).json({ message: "Failed to delete tower level" });
  }
}

export async function addQuestionsToTowerLevel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { quizIds = [] } = req.body;
    if (!Array.isArray(quizIds) || quizIds.length === 0)
      return res.status(400).json({ message: "quizIds array required" });

    const validQuizIds = (await Quiz.find({ _id: { $in: quizIds } }).select("_id")).map(
      (q) => q._id.toString()
    );

    const level = await TowerLevel.findById(id);
    if (!level) return res.status(404).json({ message: "Tower level not found" });

    const existingIds = (level.quizzes || []).map((q: any) => q.toString());
    const toAdd = quizIds.filter((qid) => validQuizIds.includes(qid) && !existingIds.includes(qid));

    level.quizzes = [...existingIds, ...toAdd].map((q) => new Types.ObjectId(q));
    await level.save();

    return res.json({ message: "Quizzes added", quizzes: level.quizzes });
  } catch (err) {
    console.error("addQuestionsToTowerLevel error:", err);
    return res.status(500).json({ message: "Failed to add quizzes to level" });
  }
}

export async function removeQuestionFromTowerLevel(req: AuthRequest, res: Response) {
  try {
    const { id, quizId } = req.params;
    const level = await TowerLevel.findById(id);
    if (!level) return res.status(404).json({ message: "Tower level not found" });

    level.quizzes = level.quizzes.filter((q: Types.ObjectId | string) => q.toString() !== quizId);
    await level.save();

    return res.json({ message: "Quiz removed from level", quizzes: level.quizzes });
  } catch (err) {
    console.error("removeQuestionFromTowerLevel error:", err);
    return res.status(500).json({ message: "Failed to remove quiz" });
  }
}

export async function getQuizBank(req: Request, res: Response) {
  try {
    const { topicId, lessonId } = req.query;
    const filter: any = { isActive: true };
    if (topicId) filter.topic = topicId;
    if (lessonId) filter.lesson = lessonId;

    const quizzes = await Quiz.find(filter)
      .populate("topic", "title")
      .populate("lesson", "title")
      .select("question type options correctAnswer explanation")
      .lean();

    return res.json(quizzes);
  } catch (err) {
    console.error("getQuizBank error:", err);
    return res.status(500).json({ message: "Failed to fetch quiz bank" });
  }
}

/* ============================================================
   Tower Progress + Completion (dành cho FE Tower Mode)
============================================================ */
export async function completeTowerChallenge(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { levelId, score = 0, timeSpent = 0 } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!levelId) return res.status(400).json({ message: "levelId required" });

    const level = await TowerLevel.findById(levelId).lean<ITowerLevel | null>();
    if (!level) return res.status(404).json({ message: "Level not found" });

    const passThreshold = level.passingScore ?? 60;
    const passed = score >= passThreshold;

    await processTowerCompletion(userId, levelId, passed, timeSpent);

    const progress = await buildUserProgressPayload(userId);

    return res.json({
      message: "Tower result recorded",
      passed,
      level: {
        id: String(level._id),
        title: level.title,
        levelNumber: level.levelNumber,
      },
      progress,
    });
  } catch (err) {
    console.error("completeTowerChallenge error:", err);
    return res.status(500).json({ message: "Failed to submit tower result" });
  }
}

export async function getUserTowerProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const progress = await buildUserProgressPayload(userId);
    return res.json(progress);
  } catch (err) {
    console.error("getUserTowerProgress error:", err);
    return res.status(500).json({ message: "Failed to fetch progress" });
  }
}

/* ============================================================
   Get level by number (optional)
============================================================ */
export async function getTowerLevelByNumber(req: Request, res: Response) {
  try {
    const num = Number(req.params.levelNumber);
    if (Number.isNaN(num)) return res.status(400).json({ message: "Invalid levelNumber" });
    const level = await TowerLevel.findOne({ levelNumber: num }).populate("quizzes").lean<ITowerLevel | null>();
    if (!level) return res.status(404).json({ message: "Tower level not found" });
    return res.json(level);
  } catch (err) {
    console.error("getTowerLevelByNumber error:", err);
    return res.status(500).json({ message: "Failed to fetch tower level by number" });
  }
}
