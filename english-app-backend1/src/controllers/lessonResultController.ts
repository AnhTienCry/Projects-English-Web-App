import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import LessonResult from '../models/LessonResult';
import Lesson from '../models/Lesson';
import QuizRankLesson from '../models/QuizRankLesson';
import UserProgress from '../models/UserProgress';
import { logActivityHelper } from '../utils/activity-logger';

/**
 * 📝 Submit Lesson Result
 * POST /api/lessons/:lessonId/result
 */
export const submitLessonResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { lessonId } = req.params;
    const { score, isPassed, timeSpent, answers } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!lessonId || score === undefined || isPassed === undefined || !timeSpent) {
      return res.status(400).json({ 
        message: 'Missing required fields: score, isPassed, timeSpent' 
      });
    }

    // Check if lesson exists (có thể là Lesson hoặc QuizRankLesson)
    let lesson = await Lesson.findById(lessonId);
    let isRankLesson = false;
    
    // Nếu không tìm thấy trong Lesson, thử tìm trong QuizRankLesson
    if (!lesson) {
      const rankLesson = await QuizRankLesson.findById(lessonId);
      if (rankLesson) {
        isRankLesson = true;
        // Tạo object giả để tương thích với logic sau
        lesson = {
          _id: rankLesson._id,
          title: rankLesson.title,
          requiredScore: 80, // Default pass score cho rank lessons
        } as any;
      } else {
        return res.status(404).json({ message: 'Lesson not found' });
      }
    }

    // Check if result already exists (update if yes, create if no)
    let lessonResult = await LessonResult.findOne({ userId, lessonId });

    if (lessonResult) {
      // Update existing result
      lessonResult.score = score;
      lessonResult.isPassed = isPassed;
      lessonResult.timeSpent = timeSpent;
      lessonResult.answers = answers || lessonResult.answers;
      lessonResult.completedAt = new Date();
      await lessonResult.save();
    } else {
      // Create new result
      lessonResult = await LessonResult.create({
        userId,
        lessonId,
        score,
        isPassed,
        timeSpent,
        answers: answers || {
          reading: { highlightedWordsClicked: [], timeSpent: 0 },
          listening: { questions: [], totalTimeSpent: 0 },
          quiz: { questions: [], totalTimeSpent: 0 }
        },
        completedAt: new Date()
      });
    }

    // Update UserProgress if passed
    if (isPassed) {
      const userProgress = await UserProgress.findOne({ userId });
      if (userProgress && !userProgress.completedLessons.includes(lessonId)) {
        userProgress.completedLessons.push(lessonId);
        userProgress.totalScore += score;
        await userProgress.save();
      }
    }

    // Log activity
    await logActivityHelper(
      userId,
      'lesson_completed',
      lessonId,
      { lessonTitle: lesson.title, score, isPassed, timeSpent }
    );

    return res.status(200).json({
      message: 'Lesson result submitted successfully',
      result: lessonResult
    });
  } catch (err) {
    console.error('submitLessonResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get all results for a lesson (Teacher/Admin)
 * GET /api/lessons/:lessonId/results
 */
export const getLessonResults = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { sortBy = 'completedAt', order = 'desc' } = req.query;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField: any = {};
    sortField[sortBy as string] = sortOrder;

    const results = await LessonResult.find({ lessonId })
      .sort(sortField)
      .lean();

    // Get user info for each result
    const User = require('../models/User').default;
    const resultsWithUser = await Promise.all(
      results.map(async (result: any) => {
        const user = await User.findById(result.userId).select('email nickname').lean();
        return {
          ...result,
          user: user || { email: 'Unknown', nickname: 'Unknown' }
        };
      })
    );

    return res.json({
      lesson: {
        id: lesson._id,
        title: lesson.title,
        level: lesson.level
      },
      results: resultsWithUser,
      stats: {
        totalAttempts: resultsWithUser.length,
        averageScore: resultsWithUser.reduce((acc: number, r: any) => acc + r.score, 0) / resultsWithUser.length || 0,
        passRate: (resultsWithUser.filter((r: any) => r.isPassed).length / resultsWithUser.length * 100) || 0,
        averageTime: resultsWithUser.reduce((acc: number, r: any) => acc + r.timeSpent, 0) / resultsWithUser.length || 0
      }
    });
  } catch (err) {
    console.error('getLessonResults error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 👤 Get user's result for a specific lesson
 * GET /api/lessons/:lessonId/results/me
 */
export const getMyLessonResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { lessonId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await LessonResult.findOne({ userId, lessonId }).lean();
    
    if (!result) {
      return res.status(404).json({ message: 'No result found for this lesson' });
    }

    return res.json(result);
  } catch (err) {
    console.error('getMyLessonResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📈 Get all lesson results for a specific user (Teacher/Admin)
 * GET /api/lessons/results/user/:userId
 */
export const getUserLessonResults = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const results = await LessonResult.find({ userId })
      .sort({ completedAt: -1 })
      .lean();

    // Get lesson info for each result
    const resultsWithLesson = await Promise.all(
      results.map(async (result: any) => {
        const lesson = await Lesson.findById(result.lessonId).select('title level order').lean();
        return {
          ...result,
          lesson: lesson || { title: 'Unknown', level: 0, order: 0 }
        };
      })
    );

    return res.json({
      userId,
      results: resultsWithLesson,
      stats: {
        totalCompleted: resultsWithLesson.length,
        averageScore: resultsWithLesson.reduce((acc: number, r: any) => acc + r.score, 0) / resultsWithLesson.length || 0,
        totalTimeSpen: resultsWithLesson.reduce((acc: number, r: any) => acc + r.timeSpent, 0),
        passedLessons: resultsWithLesson.filter((r: any) => r.isPassed).length
      }
    });
  } catch (err) {
    console.error('getUserLessonResults error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 🗑️ Delete lesson result (Admin only)
 * DELETE /api/lessons/:lessonId/results/:resultId
 */
export const deleteLessonResult = async (req: AuthRequest, res: Response) => {
  try {
    const { resultId } = req.params;

    const result = await LessonResult.findByIdAndDelete(resultId);
    
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    return res.json({ message: 'Lesson result deleted successfully' });
  } catch (err) {
    console.error('deleteLessonResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};










