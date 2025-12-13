import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Lesson, { ILesson, IReadingComponent, IListeningComponent, IQuizComponent } from '../models/Lesson';
import Vocab from '../models/Vocab';
import UserProgress from '../models/UserProgress';
import LessonResult from '../models/LessonResult';
import User from '../models/User';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';

/**
 * 🧠 Lấy tất cả bài học với thông tin progression
 */
export async function getAllLessons(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const userRole = (req.user as any)?.role || 'student'; // giả sử token có field role
    const filter: any = {};

    // 👩‍🎓 Nếu là học viên => chỉ thấy bài đã xuất bản
    if (!userId || userRole === 'student') {
      filter.isPublished = true;
    }

    const lessons = await Lesson.find(filter).sort({ level: 1, order: 1 }).lean();

    // 🧑‍🏫 Nếu là giảng viên, hoặc chưa đăng nhập => trả thẳng danh sách
    if (!userId) return res.json(lessons);

    // 🧠 Nếu có user => tính trạng thái học
    const userProgress = await UserProgress.findOne({ userId }).lean() as any;
    const completedLessons = userProgress?.completedLessons || [];

    const lessonsWithProgress = lessons.map((lesson: any) => ({
      ...lesson,
      // Unlock: nếu là level 1, hoặc bài trước đã hoàn thành
      isUnlocked:
        lesson.level === 1 ||
        lesson.level === 'A1' ||
        lesson.level === 'A2' ||
        completedLessons.includes(lesson._id.toString()),
      // Completed: đã học xong
      isCompleted: completedLessons.includes(lesson._id.toString())
    }));

    return res.json(lessonsWithProgress);
  } catch (err: any) {
    console.error('getAllLessons error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch lessons' } });
  }
}

/**
 * 📘 Lấy danh sách các bài học đã xuất bản (cho học viên)
 * GET /api/lessons/published
 */
export async function getPublishedLessons(req: Request, res: Response) {
  try {
    const lessons = await Lesson.find({ isPublished: true })
      .sort({ level: 1, order: 1 })
      .lean();

    if (!lessons || lessons.length === 0) {
      return res.status(404).json({ error: { message: 'No published lessons found' } });
    }

    return res.json(lessons);
  } catch (err: any) {
    console.error('getPublishedLessons error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch published lessons' } });
  }
}

/**
 * 🧱 Lấy danh sách bài học chưa xuất bản (cho giảng viên)
 * GET /api/lessons/unpublished
 */
export async function getUnpublishedLessons(req: Request, res: Response) {
  try {
    const lessons = await Lesson.find({ isPublished: false })
      .sort({ level: 1, order: 1 })
      .lean();

    if (!lessons || lessons.length === 0) {
      return res.status(404).json({ error: { message: 'No unpublished lessons found' } });
    }

    return res.json(lessons);
  } catch (err: any) {
    console.error('getUnpublishedLessons error:', err);
    return res.status(500).json({ error: { message: 'Failed to fetch unpublished lessons' } });
  }
}

/**
 * 🧠 Lấy chi tiết 1 bài học theo ID
 */
export async function getLessonById(req: Request, res: Response) {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: { message: 'Lesson not found' } });

    return res.json(lesson);
  } catch (err) {
    console.error('getLessonById error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch lesson' } });
  }
}

/**
 * 🧠 Tạo bài học mới với cấu trúc mới
 */
export async function createLesson(req: Request, res: Response) {
  try {
    console.log('📝 Creating lesson with data:', req.body);
    
    const { 
      title, 
      description, 
      level, 
      order, 
      components,
      requiredScore = 80,
      isPublished = false
    } = req.body;

    console.log('📝 Parsed data:', { title, description, level, order, components, requiredScore, isPublished });

    if (!title || level === undefined || level === null || order === undefined || order === null) {
      console.log('❌ Missing required fields:', { title, level, order });
      return res.status(400).json({ 
        error: { message: 'title, level, order are required' } 
      });
    }

    // Tạo components mặc định nếu không có (cho web admin)
    let lessonComponents = components;
    if (!components || !components.reading || !components.listening || !components.quiz) {
      lessonComponents = {
        reading: {
          content: description || 'Lesson content will be added later.',
          highlightedWords: [],
          contextualTranslationEnabled: true,
          manualTranslationEnabled: true
        },
        listening: {
          audioUrl: '',
          exerciseType: 'word_recognition',
          questions: []
        },
        quiz: {
          questions: [],
          passingScore: 80,
          timeLimit: null
        }
      };
    }

    // Tạo bài học với cấu trúc mới
    console.log('📝 Creating lesson with components:', lessonComponents);
    const lesson = await Lesson.create({
      title,
      description,
      level: parseInt(level),
      order: parseInt(order),
      components: lessonComponents,
      requiredScore,
      isPublished,
      isUnlocked: parseInt(level) === 1, // Level 1 luôn được unlock
      isCompleted: false
    });
    console.log('✅ Lesson created successfully:', lesson._id);

    // 🔔 Gửi thông báo cho tất cả users về lesson mới CHỈ KHI ĐÃ XUẤT BẢN
    if (isPublished) {
      try {
        await sendNewLessonNotification(lesson, req);
        console.log('📢 Notification sent for published lesson');
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Không fail request nếu notification lỗi
      }
    } else {
      console.log('📝 Lesson created as draft - no notification sent');
    }

    const fullLesson = await Lesson.findById(lesson._id).lean();
    console.log('✅ Returning lesson:', fullLesson);
    return res.status(201).json(fullLesson);
  } catch (err: any) {
    console.error('❌ createLesson error:', err);
    console.error('❌ Error details:', err.message);
    console.error('❌ Stack trace:', err.stack);
    return res.status(500).json({ error: { message: err.message || 'Failed to create lesson' } });
  }
}

/**
 * 🧠 Cập nhật bài học
 */
export async function updateLesson(req: Request, res: Response) {
  try {
    const updated = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: { message: 'Lesson not found' } });
    return res.json(updated);
  } catch (err) {
    console.error('updateLesson error', err);
    return res.status(500).json({ error: { message: 'Failed to update lesson' } });
  }
}

/**
 * 🚀 Xuất bản hoặc ẩn bài học
 * PATCH /api/lessons/:id/publish?value=true|false
 */
export async function publishLesson(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { value } = req.query;

    const isPublished = value === 'true';
    const updated = await Lesson.findByIdAndUpdate(
      id,
      { isPublished },
      { new: true }
    ).lean() as any;

    if (!updated) {
      return res.status(404).json({ error: { message: 'Lesson not found' } });
    }

    // 🔔 Gửi thông báo CHỈ KHI PUBLISH (không phải unpublish)
    if (isPublished) {
      try {
        await sendNewLessonNotification(updated, req);
        console.log('📢 Notification sent for published lesson:', updated.title);
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Không fail request nếu notification lỗi
      }
    }

    return res.json({
      message: `Lesson ${isPublished ? 'published' : 'unpublished'} successfully`,
      isPublished: updated.isPublished,
    });
  } catch (err: any) {
    console.error('publishLesson error:', err);
    return res.status(500).json({ error: { message: 'Failed to update publish state' } });
  }
}


/**
 * 🧠 Xóa bài học (và từ vựng kèm theo)
 */
export async function deleteLesson(req: Request, res: Response) {
  try {
    await Vocab.deleteMany({ lesson: req.params.id });
    await Lesson.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteLesson error', err);
    return res.status(500).json({ error: { message: 'Failed to delete lesson' } });
  }
}

/**
 * 🧠 Lấy từ vựng theo ID bài học
 */
export async function getVocabForLesson(req: Request, res: Response) {
  try {
    const items = await Vocab.find({ lesson: req.params.id }).lean();
    return res.json(items);
  } catch (err) {
    console.error('getVocabForLesson error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch vocab' } });
  }
}

/**
 * 🎯 Submit kết quả bài học và cập nhật progression
 */
export async function submitLessonResult(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    const { lessonId, score, timeSpent, answers } = req.body;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    if (!lessonId || score === undefined || !timeSpent || !answers) {
      return res.status(400).json({ 
        error: { message: 'lessonId, score, timeSpent, answers are required' } 
      });
    }

    // Lấy thông tin lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: { message: 'Lesson not found' } });
    }

    const isPassed = score >= lesson.requiredScore;

    // Lưu kết quả bài học
    const lessonResult = await LessonResult.create({
      userId,
      lessonId,
      score,
      isPassed,
      timeSpent,
      answers,
      completedAt: new Date()
    });

    // Cập nhật user progress
    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = await UserProgress.create({
        userId,
        currentLevel: 1,
        currentLesson: lessonId,
        completedLessons: [],
        totalScore: 0,
        streak: 0,
        badges: [],
        totalStudyTime: 0
      });
    }

    // Cập nhật progress
    if (isPassed && !userProgress.completedLessons.includes(lessonId)) {
      userProgress.completedLessons.push(lessonId);
      userProgress.totalScore += score;
      userProgress.totalStudyTime += timeSpent;
      
      // Cập nhật streak
      const today = new Date().toDateString();
      const lastActive = new Date(userProgress.lastActiveDate).toDateString();
      if (today !== lastActive) {
        userProgress.streak += 1;
        userProgress.lastActiveDate = new Date();
      }

      // Unlock lesson tiếp theo
      const nextLesson = await Lesson.findOne({
        level: lesson.level,
        order: lesson.order + 1
      });

      if (nextLesson) {
        nextLesson.isUnlocked = true;
        await nextLesson.save();
      } else {
        // Nếu không có lesson tiếp theo trong level, unlock level tiếp theo
        const nextLevelFirstLesson = await Lesson.findOne({
          level: lesson.level + 1,
          order: 1
        });

        if (nextLevelFirstLesson) {
          nextLevelFirstLesson.isUnlocked = true;
          await nextLevelFirstLesson.save();
          userProgress.currentLevel = lesson.level + 1;
        }
      }

      await userProgress.save();
    }

    return res.json({
      lessonResult,
      userProgress,
      isPassed,
      nextLessonUnlocked: isPassed
    });

  } catch (err) {
    console.error('submitLessonResult error', err);
    return res.status(500).json({ error: { message: 'Failed to submit lesson result' } });
  }
}

/**
 * 📊 Lấy progress của user
 */
export async function getUserProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId }).lean();
    if (!userProgress) {
      return res.json({
        currentLevel: 1,
        currentLesson: null,
        completedLessons: [],
        totalScore: 0,
        streak: 0,
        badges: [],
        totalStudyTime: 0
      });
    }

    return res.json(userProgress);
  } catch (err) {
    console.error('getUserProgress error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch user progress' } });
  }
}

/**
 * 📊 Lấy progress của user kèm danh sách lessons (cho mobile app)
 */
export async function getUserProgressWithLessons(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const userProgress = await UserProgress.findOne({ userId }).lean() as any;
    const lessons = await Lesson.find({ isPublished: true }).sort({ level: 1, order: 1 }).lean();
    const completedLessons = userProgress?.completedLessons || [];

    // Lấy tất cả LessonResult của user để lấy percent
    const lessonResults = await LessonResult.find({ userId }).lean();
    const lessonResultMap = new Map();
    lessonResults.forEach((lr: any) => {
      lessonResultMap.set(lr.lessonId.toString(), lr);
    });

    // Tính progress cho từng lesson
    const lessonsWithProgress = lessons.map((lesson: any) => {
      const lessonResult = lessonResultMap.get(lesson._id.toString());
      const percent = lessonResult ? lessonResult.score : 0;
      const isCompleted = completedLessons.includes(lesson._id.toString());
      const completedAt = lessonResult?.completedAt || null;
      const lastAccessedAt = lessonResult?.updatedAt || lessonResult?.completedAt || null;
      
      return {
        id: lesson._id,
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        order: lesson.order,
        percent: percent,
        isCompleted: isCompleted,
        is_completed: isCompleted,
        completedAt: completedAt,
        lastAccessedAt: lastAccessedAt,
      };
    });

    return res.json({
      items: lessonsWithProgress,
      progress: userProgress || {
        currentLevel: 1,
        currentLesson: null,
        completedLessons: [],
        completedTopics: [],
        completedTowerLevels: [],
        totalScore: 0,
        streak: 0,
        totalStudyTime: 0,
        lastActiveDate: new Date()
      }
    });
  } catch (err) {
    console.error('getUserProgressWithLessons error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch user progress with lessons' } });
  }
}

/**
 * 🏆 Lấy leaderboard
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await UserProgress.find()
      .populate('userId', 'nickname email')
      .sort({ totalScore: -1 })
      .limit(Number(limit))
      .lean();

    return res.json(leaderboard);
  } catch (err) {
    console.error('getLeaderboard error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch leaderboard' } });
  }
}

/**
 * 🔔 Gửi thông báo lesson mới cho tất cả users
 */
async function sendNewLessonNotification(lesson: any, req: Request) {
  try {
    // Lấy tất cả users (chỉ STUDENT để tránh spam admin/teacher)
    const users = await User.find({ role: 'STUDENT' }).select('_id');
    
    if (users.length === 0) {
      console.log('No students found to send notification');
      return;
    }

    // Tạo notification cho từng user
    const notifications = users.map(user => ({
      userId: user._id,
      type: 'lesson',
      title: 'New lesson available!',
      message: `${lesson.title} is now open.`,
    }));

    // Bulk insert notifications
    await Notification.insertMany(notifications);

    // Gửi realtime notification qua Socket.io
    const io = req.app.get("io");
    if (io) {
      // Gửi đến tất cả users
      users.forEach(user => {
        // Gửi notification thông thường
        io.to(user._id.toString()).emit("notification.send", {
          type: 'lesson',
          title: 'New lesson available!',
          message: `${lesson.title} is now open.`,
          createdAt: new Date(),
        });

        // 🔔 Gửi system notification (Android/iOS)
        io.to(user._id.toString()).emit("system_notification", {
          _id: `system_${Date.now()}_${user._id}`,
          type: 'lesson',
          title: '📚 Bài học mới',
          message: `"${lesson.title}" đã sẵn sàng để học!`,
          lessonId: lesson._id,
          lessonTitle: lesson.title,
          isRead: false,
          createdAt: new Date(),
        });
      });
    }

    console.log(`✅ Sent new lesson notification to ${users.length} students`);
  } catch (error) {
    console.error('Error sending new lesson notification:', error);
    throw error;
  }
}
