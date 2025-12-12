import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import UserProgress, { IUserProgress } from '../models/UserProgress';
import Lesson from '../models/Lesson';
import Level from '../models/Level';
import Badge from '../models/Badge';
import Topic from "../models/Topic";
import ActivityLog from "../models/ActivityLog";
import User from '../models/User';
import { Types } from 'mongoose';
/**
 * 🏗️ Khởi tạo progression cho user mới
 */
export async function initializeUserProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    // Kiểm tra xem user đã có progress chưa
    const existingProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (existingProgress) {
      return res.json(existingProgress);
    }

    // Tạo progress mới
    const userProgress = await UserProgress.create({
      userId: new Types.ObjectId(userId),
      currentLesson: null,
      completedLessons: [],
      completedTopics: [],
      completedTowerLevels: [],
      totalScore: 0,
      streak: 0,
      totalStudyTime: 0,
      lastActiveDate: new Date()
    });

    // Unlock lesson đầu tiên của level 1
    const firstLesson = await Lesson.findOne({ level: 1, order: 1 });
    if (firstLesson) {
      firstLesson.isUnlocked = true;
      await firstLesson.save();
      userProgress.currentLesson = firstLesson._id.toString();
      await userProgress.save();
    }

    return res.status(201).json(userProgress);
  } catch (err) {
    console.error('initializeUserProgress error:', err);
    return res.status(500).json({ error: { message: 'Failed to initialize user progress' } });
  }
}

/**
 * 📊 Lấy thông tin progression của user
 */
export async function getUserProgression(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) })
      .lean() as any;

    if (!userProgress) {
      return res.status(404).json({ error: { message: 'User progress not found' } });
    }

    // Lấy danh sách lessons đã hoàn thành
    const completedLessons = await Lesson.find({
      _id: { $in: userProgress.completedLessons.map((id: string) => new Types.ObjectId(id)) }
    }).select('title level order').lean();

    // Lấy danh sách topics đã hoàn thành
    const completedTopics = await Topic.find({
      _id: { $in: userProgress.completedTopics.map((id: string) => new Types.ObjectId(id)) }
    }).select('title description order').lean();

    // Tính toán level hiện tại dựa trên số lesson đã hoàn thành
    const currentLevel = Math.floor(userProgress.completedLessons.length / 5) + 1;
    const levelInfo = await Level.findOne({ number: currentLevel }).lean();

    return res.json({
      ...userProgress,
      currentLevel,
      levelInfo,
      completedLessons,
      completedTopics,
      progressPercentage: calculateProgressPercentage(userProgress)
    });
  } catch (err) {
    console.error('getUserProgression error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch user progression' } });
  }
}

/**
 * ✅ Đánh dấu hoàn thành Topic
 * POST /api/progressions/complete-topic
 * Body: { topicId: string }
 */
export async function completeTopic(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { topicId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
    if (!topicId) {
      return res.status(400).json({ error: { message: 'topicId required' } });
    }

    // Tìm progress của user
    let userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (!userProgress) {
      // Nếu chưa có, khởi tạo
      userProgress = await UserProgress.create({
        userId: new Types.ObjectId(userId),
        completedLessons: [],
        completedTopics: [topicId],
        completedTowerLevels: [],
        totalScore: 0,
        streak: 1,
        totalStudyTime: 0,
        lastActiveDate: new Date(),
      });

      // Emit leaderboard update after create
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("leaderboard.update", { userId: userProgress.userId?.toString?.(), totalScore: userProgress.totalScore });
        }
      } catch (e) {
        console.error('emit leaderboard.update error:', e);
      }
    } else {
      // Nếu topic chưa có trong danh sách thì thêm
      if (!userProgress.completedTopics.includes(topicId)) {
        userProgress.completedTopics.push(topicId);
      }

      // Cập nhật streak và ngày hoạt động
      const today = new Date().toDateString();
      const lastActive = new Date(userProgress.lastActiveDate).toDateString();

      if (today !== lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastActive !== yesterdayStr) userProgress.streak = 1;
        else userProgress.streak += 1;

        userProgress.lastActiveDate = new Date();
      }

      await userProgress.save();
      await checkStreakBadges(userProgress);

      // Emit leaderboard update after save / badge check
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("leaderboard.update", { userId: userProgress.userId?.toString?.(), totalScore: userProgress.totalScore });
        }
      } catch (e) {
        console.error('emit leaderboard.update error:', e);
      }
    }

    // 📝 Log activity for calendar
    await logActivity(userId, 'topic', topicId);

    // Gửi thông báo khi hoàn thành topic
    try {
      const topic = await Topic.findById(topicId);
      if (topic) {
        const io = req.app.get("io");
        if (io) {
          io.to(userId.toString()).emit("notification.send", {
            title: "🎉 Hoàn thành chủ đề!",
            body: `Chúc mừng! Bạn đã hoàn thành: ${topic.title}`,
            sentAt: new Date(),
          });
        }

        // Lưu vào DB
        const Notification = require('../models/Notification').default;
        await Notification.create({
          userId,
          type: 'progress',
          title: "🎉 Hoàn thành chủ đề!",
          message: `Chúc mừng! Bạn đã hoàn thành: ${topic.title}`,
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({
      message: 'Topic completed successfully',
      completedTopics: userProgress.completedTopics,
      streak: userProgress.streak,
    });
  } catch (err) {
    console.error('completeTopic error:', err);
    return res.status(500).json({ error: { message: 'Failed to complete topic' } });
  }
}

/**
 * 🏆 Lấy leaderboard với thông tin chi tiết
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { limit = 10, level } = req.query;
    const filter: any = {};
    if (level) filter.currentLevel = Number(level);

    console.log('📊 getLeaderboard called with filter:', filter, 'limit:', limit);

    // Sử dụng aggregation pipeline để join với User và chỉ lấy STUDENT
    const User = require('../models/User').default;
    const userCollectionName = User.collection.name; // 'users'
    
    const pipeline: any[] = [
      // Match UserProgress records
      { $match: filter },
      
      // Join với User collection
      {
        $lookup: {
          from: userCollectionName,
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      
      // Unwind user array (chỉ 1 user)
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      
      // CHỈ LẤY USERS CÓ ROLE = 'STUDENT'
      {
        $match: {
          'user.role': { $in: ['STUDENT', 'student'] }
        }
      },
      
      // Sort by totalScore desc, streak desc
      { $sort: { totalScore: -1, streak: -1 } },
      
      // Limit
      { $limit: Number(limit) }
    ];

    const leaderboard = await UserProgress.aggregate(pipeline);

    console.log('📊 Found UserProgress records with STUDENT role:', leaderboard.length);

    if (leaderboard.length === 0) {
      console.log('⚠️ No UserProgress records found with STUDENT role');
      return res.json([]);
    }

    // Transform aggregation result to match expected format
    const transformedLeaderboard = leaderboard.map((u: any) => ({
      ...u,
      userId: u.userId,
      user: u.user ? {
        _id: u.user._id,
        nickname: u.user.nickname,
        email: u.user.email,
        role: u.user.role,
        avatarUrl: u.user.avatarUrl
      } : null
    }));

    // build quick map userId -> nickname for badge display
    const userMap: Record<string, string> = {};
    transformedLeaderboard.forEach((u: any) => {
      const uid = u.userId?.toString?.() || u.userId?._id?.toString?.() || u.userId;
      if (uid) {
        userMap[uid] = u.user?.nickname || '';
      }
    });

    // lấy userId list để truy vấn badges
    const userIds = Array.from(new Set(
      transformedLeaderboard
        .map((u: any) => {
          const uid = u.userId?.toString?.() || u.userId?._id?.toString?.() || u.userId;
          return uid ? uid.toString() : null;
        })
        .filter(Boolean) as string[]
    ));

    console.log('📊 UserIds for badges:', userIds.length);

    // Lấy badges của các user này và gom theo userId (bao gồm tên user)
    let badgesByUser: Record<string, any[]> = {};
    if (userIds.length > 0) {
      const badgeDocs = await Badge.find({ users: { $in: userIds } }).select('name icon users').lean();
      console.log('📊 Found badges:', badgeDocs.length);
      for (const b of badgeDocs) {
        (b.users || []).forEach((uid: any) => {
          const id = uid?.toString?.();
          if (!id) return;
          badgesByUser[id] = badgesByUser[id] || [];
          badgesByUser[id].push({
            name: b.name,
            icon: b.icon,
            userName: userMap[id] || null
          });
        });
      }
    }

    // Map to response format (all records here are already valid STUDENTs)
    const students = transformedLeaderboard
      .map((user: any, index: number) => {
        const uid = user.userId?.toString?.() || user.userId?._id?.toString?.() || user.userId?.toString() || null;
        const userObj = user.user;
        return {
          _id: user._id,
          userId: uid,
          totalScore: user.totalScore || 0,
          streak: user.streak || 0,
          totalStudyTime: user.totalStudyTime || 0,
          currentLesson: user.currentLesson || null,
          completedLessons: user.completedLessons || [],
          completedTopics: user.completedTopics || [],
          completedTowerLevels: user.completedTowerLevels || [],
          lastActiveDate: user.lastActiveDate,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          user: userObj ? {
            _id: userObj._id,
            nickname: userObj.nickname || '',
            email: userObj.email || '',
            role: userObj.role || 'STUDENT',
            avatar: userObj.avatarUrl || null,
            avatarUrl: userObj.avatarUrl || null
          } : null,
          badges: badgesByUser[uid] || [],
          rank: index + 1
        };
      });

    console.log('📊 Final students count:', students.length);
    return res.json(students);
  } catch (err) {
    console.error('❌ getLeaderboard error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch leaderboard' } });
  }
}

/**
 * 🎯 Cập nhật streak của user (logic Duolingo)
 * - Mỗi ngày làm ít nhất 1 bài tập → +1 streak
 * - Nếu ngày tiếp theo không làm → -1 streak (min 0)
 */
export async function updateUserStreak(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (!userProgress) {
      return res.status(404).json({ error: { message: 'User progress not found' } });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();
    
    const lastActive = new Date(userProgress.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    const lastActiveStr = lastActive.toDateString();

    // Nếu hôm nay đã làm bài tập
    if (todayStr === lastActiveStr) {
      // Đã làm hôm nay, không cần update streak
      return res.json({
        streak: userProgress.streak,
        lastActiveDate: userProgress.lastActiveDate
      });
    }

    // Tính số ngày đã trôi qua
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Hôm qua đã làm, hôm nay làm → +1 streak
      userProgress.streak += 1;
    } else if (daysDiff > 1) {
      // Đã bỏ qua nhiều ngày → reset streak về 1
      userProgress.streak = 1;
    } else {
      // Lần đầu làm → streak = 1
      if (userProgress.streak === 0) {
        userProgress.streak = 1;
      }
    }

    userProgress.lastActiveDate = today;
    await userProgress.save();
    await checkStreakBadges(userProgress);

    return res.json({
      streak: userProgress.streak,
      lastActiveDate: userProgress.lastActiveDate
    });
  } catch (err) {
    console.error('updateUserStreak error:', err);
    return res.status(500).json({ error: { message: 'Failed to update user streak' } });
  }
}

/**
 * 📝 Update activity và streak (gọi khi submit quiz/lesson)
 * POST /api/progressions/update-activity
 */
export async function updateActivity(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (!userProgress) {
      // Tạo mới nếu chưa có
      const newProgress = await UserProgress.create({
        userId: new Types.ObjectId(userId),
        completedLessons: [],
        completedTopics: [],
        completedTowerLevels: [],
        totalScore: 0,
        streak: 1,
        totalStudyTime: 0,
        lastActiveDate: new Date(),
      });
      await logActivity(userId, 'quiz', 'general');
      return res.json({
        streak: newProgress.streak,
        lastActiveDate: newProgress.lastActiveDate
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toDateString();
    
    const lastActive = new Date(userProgress.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    const lastActiveStr = lastActive.toDateString();

    // Nếu hôm nay chưa làm bài tập
    if (todayStr !== lastActiveStr) {
      // Tính số ngày đã trôi qua
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Hôm qua đã làm, hôm nay làm → +1 streak
        userProgress.streak += 1;
      } else if (daysDiff > 1) {
        // Đã bỏ qua nhiều ngày → reset streak về 1
        userProgress.streak = 1;
      } else {
        // Lần đầu làm → streak = 1
        if (userProgress.streak === 0) {
          userProgress.streak = 1;
        }
      }

      userProgress.lastActiveDate = today;
      await userProgress.save();
      await checkStreakBadges(userProgress);
    }

    // Log activity cho calendar
    await logActivity(userId, 'quiz', 'general');

    return res.json({
      streak: userProgress.streak,
      lastActiveDate: userProgress.lastActiveDate
    });
  } catch (err) {
    console.error('updateActivity error:', err);
    return res.status(500).json({ error: { message: 'Failed to update activity' } });
  }
}

/**
 * 🏅 Kiểm tra và cấp badge dựa trên streak
 */
async function checkStreakBadges(userProgress: any) {
  try {
    const streakBadges = [
      { streak: 7, badgeName: 'Week Warrior', title: '🏆 Nhận huy hiệu mới!' },
      { streak: 30, badgeName: 'Monthly Master', title: '🏆 Nhận huy hiệu đặc biệt!' },
      { streak: 100, badgeName: 'Century Scholar', title: '🏆 Nhận huy hiệu huyền thoại!' }
    ];

    const Notification = require('../models/Notification').default;
    
    for (const streakBadge of streakBadges) {
      if (userProgress.streak >= streakBadge.streak) {
        const badge = await Badge.findOne({ name: streakBadge.badgeName });
        if (badge) {
          // Gửi thông báo nhận badge
          await Notification.create({
            userId: userProgress.userId,
            type: 'badge',
            title: streakBadge.title,
            message: `Bạn đã nhận huy hiệu ${badge.name} với chuỗi ${streakBadge.streak} ngày học!`,
          });
        }
      }
    }

    await userProgress.save();
  } catch (err) {
    console.error('checkStreakBadges error:', err);
  }
}

/**
 * 🥇 Kiểm tra và cấp badge dựa trên điểm số
 */
async function checkScoreBadges(userProgress: any) {
  try {
    const scoreBadges = [
      { score: 50, badgeName: 'Bronze Scorer', title: '🏅 Bạn đạt Bronze Scorer!' },
      { score: 200, badgeName: 'Silver Scorer', title: '🏅 Bạn đạt Silver Scorer!' },
      { score: 500, badgeName: 'Gold Scorer', title: '🏅 Bạn đạt Gold Scorer!' }
    ];

    const Notification = require('../models/Notification').default;

    for (const sb of scoreBadges) {
      if (userProgress.totalScore >= sb.score) {
        const badge = await Badge.findOne({ name: sb.badgeName });
        if (badge) {
          // ensure users array exists and user is added only once
          const uid = userProgress.userId?.toString?.();
          if (uid) {
            const already = (badge.users || []).some((u: any) => u?.toString?.() === uid);
            if (!already) {
              badge.users = badge.users || [];
              badge.users.push(new Types.ObjectId(uid));
              await badge.save();

              // Create notification for this user
              await Notification.create({
                userId: userProgress.userId,
                type: 'badge',
                title: sb.title,
                message: `Bạn đã nhận huy hiệu ${badge.name} khi đạt ${sb.score} điểm!`
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('checkScoreBadges error:', err);
  }
}

/**
 * 📈 Tính phần trăm hoàn thành
 */
function calculateProgressPercentage(userProgress: any): number {
  const completedCount = userProgress.completedLessons.length;
  const totalLessonsInLevel = 10;
  return Math.min((completedCount / totalLessonsInLevel) * 100, 100);
}

/**
 * 🎮 Lấy thông tin gamification
 */
export async function getGamificationInfo(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) })
      .lean() as any;

    if (!userProgress) {
      return res.status(404).json({ error: { message: 'User progress not found' } });
    }

    // Tính toán level hiện tại dựa trên số lesson đã hoàn thành
    const currentLevel = Math.floor(userProgress.completedLessons.length / 5) + 1;
    const levelInfo = await Level.findOne({ number: currentLevel }).lean();

    const stats = {
      totalLessonsCompleted: userProgress.completedLessons.length,
      totalTopicsCompleted: userProgress.completedTopics?.length || 0,
      totalTowerLevelsCompleted: userProgress.completedTowerLevels?.length || 0,
      currentStreak: userProgress.streak,
      totalScore: userProgress.totalScore,
      totalStudyTime: userProgress.totalStudyTime,
      currentLevel,
      levelInfo
    };

    return res.json(stats);
  } catch (err) {
    console.error('getGamificationInfo error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch gamification info' } });
  }
}

/**
 * 🔓 Unlock lesson tiếp theo (dành cho admin/teacher)
 */
export async function unlockNextLesson(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { lessonId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: { message: 'Lesson not found' } });
    }

    lesson.isUnlocked = true;
    await lesson.save();

    return res.json({
      message: 'Lesson unlocked successfully',
      lesson: {
        id: lesson._id,
        title: lesson.title,
        level: lesson.level,
        order: lesson.order
      }
    });
  } catch (err) {
    console.error('unlockNextLesson error:', err);
    return res.status(500).json({ error: { message: 'Failed to unlock lesson' } });
  }
}

/**
 * ✅ Complete Lesson
 * POST /api/progressions/complete-lesson
 * Body: { lessonId: string, score: number }
 */
export async function completeLesson(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { lessonId, score = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
    if (!lessonId) {
      return res.status(400).json({ error: { message: 'lessonId required' } });
    }

    // Find or create user progress
    let userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) });
    if (!userProgress) {
      userProgress = await UserProgress.create({
        userId: new Types.ObjectId(userId),
        completedLessons: [lessonId],
        completedTopics: [],
        completedTowerLevels: [],
        totalScore: score,
        streak: 1,
        totalStudyTime: 0,
        lastActiveDate: new Date(),
      });

      // Emit leaderboard update after create
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("leaderboard.update", { userId: userProgress.userId?.toString?.(), totalScore: userProgress.totalScore });
        }
      } catch (e) {
        console.error('emit leaderboard.update error:', e);
      }
    } else {
      // Add lesson to completed if not already there
      if (!userProgress.completedLessons.includes(lessonId)) {
        userProgress.completedLessons.push(lessonId);
      }

      // Update score
      userProgress.totalScore += score;

      // Update streak
      const today = new Date().toDateString();
      const lastActive = new Date(userProgress.lastActiveDate).toDateString();

      if (today !== lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastActive !== yesterdayStr) {
          userProgress.streak = 1;
        } else {
          userProgress.streak += 1;
        }

        userProgress.lastActiveDate = new Date();
      }

      await userProgress.save();
      await checkStreakBadges(userProgress);
      await checkScoreBadges(userProgress);

      // Emit leaderboard update after save / badge check
      try {
        const io = req.app.get("io");
        if (io) {
          io.emit("leaderboard.update", { userId: userProgress.userId?.toString?.(), totalScore: userProgress.totalScore });
        }
      } catch (e) {
        console.error('emit leaderboard.update error:', e);
      }
    }

    // 📝 Log activity for calendar
    await logActivity(userId, 'lesson', lessonId);

    // Send notification
    try {
      const lesson = await Lesson.findById(lessonId);
      if (lesson) {
        const Notification = require('../models/Notification').default;
        await Notification.create({
          userId,
          type: 'progress',
          title: '🎉 Hoàn thành bài học!',
          message: `Chúc mừng! Bạn đã hoàn thành: ${lesson.title}`,
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    return res.status(200).json({
      message: 'Lesson completed successfully',
      completedLessons: userProgress.completedLessons,
      totalScore: userProgress.totalScore,
      streak: userProgress.streak,
    });
  } catch (err) {
    console.error('completeLesson error:', err);
    return res.status(500).json({ error: { message: 'Failed to complete lesson' } });
  }
}

/**
 * 📝 Log activity for calendar tracking
 */
async function logActivity(userId: string, type: string, id: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Find or create activity log for today
    let activityLog = await ActivityLog.findOne({
      userId: new Types.ObjectId(userId),
      date: today
    });
    
    if (!activityLog) {
      activityLog = await ActivityLog.create({
        userId: new Types.ObjectId(userId),
        date: today,
        activities: [{ type, id, completedAt: new Date() }]
      });
    } else {
      // Check if this activity already exists
      const exists = activityLog.activities.some((a: { type: string; id: string; completedAt: Date }) => a.type === type && a.id === id);
      if (!exists) {
        activityLog.activities.push({ type, id, completedAt: new Date() });
        await activityLog.save();
      }
    }
  } catch (err) {
    console.error('logActivity error:', err);
  }
}

/**
 * 📅 Lấy activity history (danh sách ngày đã học)
 * GET /api/progressions/activity-history
 * Query: { year, month } (optional)
 */
export async function getActivityHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const { year, month } = req.query;
    
    let startDate: Date;
    let endDate: Date;
    
    if (year && month) {
      // Get specific month
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0);
    } else {
      // Get last 3 months by default
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const activityLogs = await ActivityLog.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).lean();
    
    // Format response: array of dates with activity count
    const history = activityLogs.map(log => ({
      date: log.date,
      activityCount: log.activities.length,
      activities: log.activities
    }));
    
    return res.json({
      history,
      totalDays: history.length
    });
  } catch (err) {
    console.error('getActivityHistory error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch activity history' } });
  }
}

/**
 * 🧠 Lấy trạng thái hoàn thành của các Topic trong 1 Lesson
 * GET /api/progressions/topic-status/:lessonId
 */
export async function getTopicStatusByLesson(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { lessonId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: { message: "Unauthorized" } });
    }
    if (!lessonId) {
      return res.status(400).json({ error: { message: "lessonId required" } });
    }

    // Lấy tiến độ học của user
    const userProgress = await UserProgress.findOne({ userId: new Types.ObjectId(userId) }).lean() as any;

    if (!userProgress) {
      return res.status(404).json({ error: { message: "User progress not found" } });
    }


    // Lấy toàn bộ Topic của bài học này
    const topics = await Topic.find({ lessonId }).select("_id title description order").sort({ order: 1 }).lean();

    // Mapping trạng thái
    const result = topics.map((t: any) => ({
      _id: t._id,
      title: t.title,
      description: t.description,
      order: t.order,
      completed: userProgress.completedTopics?.includes(t._id.toString()) || false
    }));

    // Tính phần trăm hoàn thành
    const completedCount = result.filter(r => r.completed).length;
    const percent = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

    return res.json({
      lessonId,
      totalTopics: topics.length,
      completedCount,
      progressPercent: percent,
      topics: result
    });
  } catch (err) {
    console.error("getTopicStatusByLesson error:", err);
    return res.status(500).json({ error: { message: "Failed to fetch topic status" } });
  }
}