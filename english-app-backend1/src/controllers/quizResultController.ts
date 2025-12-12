import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import QuizResult from '../models/QuizResult';
import Quiz from '../models/Quiz';
import UserProgress from '../models/UserProgress';

/**
 * 📝 Submit Quiz Result
 * POST /api/quizzes/:quizId/result
 */
export const submitQuizResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { quizId } = req.params;
    const { answers, score, timeSpent, passed } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!quizId || !answers || score === undefined || !timeSpent) {
      return res.status(400).json({ 
        message: 'Missing required fields: answers, score, timeSpent' 
      });
    }

    // Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if result already exists
    let quizResult = await QuizResult.findOne({ user: userId, quiz: quizId });

    if (quizResult) {
      // Update if score is better
      if (score > quizResult.score) {
        quizResult.answers = answers;
        quizResult.score = score;
        quizResult.timeSpent = timeSpent;
        quizResult.passed = passed;
        quizResult.completedAt = new Date();
        await quizResult.save();
      }
    } else {
      // Create new result
      quizResult = await QuizResult.create({
        user: userId,
        quiz: quizId,
        answers,
        score,
        timeSpent,
        passed: passed !== undefined ? passed : score >= 70,
        completedAt: new Date()
      });
    }

    // Update UserProgress
    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      // Initialize if doesn't exist
      userProgress = await UserProgress.create({
        userId,
        currentLevel: 1,
        completedLessons: [],
        completedTopics: [],
        totalScore: score,
        streak: 1,
        badges: [],
        totalStudyTime: 0,
        lastActiveDate: new Date(),
      });
    } else {
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
    }

    // If passed and has lesson, mark lesson as completed
    if (quizResult.passed && quiz.lesson) {
      try {
        if (!userProgress.completedLessons.includes(quiz.lesson.toString())) {
          userProgress.completedLessons.push(quiz.lesson.toString());
          await userProgress.save();
          
          // Send notification
          const Lesson = require('../models/Lesson').default;
          const lesson = await Lesson.findById(quiz.lesson);
          if (lesson) {
            const Notification = require('../models/Notification').default;
            await Notification.create({
              userId,
              type: 'progress',
              title: '🎉 Hoàn thành bài học!',
              message: `Chúc mừng! Bạn đã hoàn thành quiz: ${lesson.title}`,
            });
          }
        }
      } catch (progressError) {
        console.error('Error updating lesson progress:', progressError);
      }
    }

    return res.status(200).json({
      message: 'Quiz result submitted successfully',
      result: quizResult,
      progress: {
        totalScore: userProgress.totalScore,
        streak: userProgress.streak,
        completedLessons: userProgress.completedLessons.length,
      }
    });
  } catch (err) {
    console.error('submitQuizResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get all results for a quiz (Teacher/Admin)
 * GET /api/quizzes/:quizId/results
 */
export const getQuizResults = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { sortBy = 'completedAt', order = 'desc' } = req.query;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField: any = {};
    sortField[sortBy as string] = sortOrder;

    const results = await QuizResult.find({ quiz: quizId })
      .populate('user', 'email nickname')
      .sort(sortField)
      .lean();

    // Calculate question statistics
    const questionStats: Array<{
      questionIndex: number;
      correctCount: number;
      incorrectCount: number;
      correctRate: string;
    }> = [];
    
    // If quiz has multiple questions, analyze which questions are hardest
    if (results.length > 0 && results[0].answers) {
      const totalAnswers = results.length;
      const questionsCount = results[0].answers.length;
      
      for (let i = 0; i < questionsCount; i++) {
        const correctCount = results.filter((r: any) => 
          r.answers[i] && r.answers[i].isCorrect
        ).length;
        
        questionStats.push({
          questionIndex: i,
          correctCount,
          incorrectCount: totalAnswers - correctCount,
          correctRate: (correctCount / totalAnswers * 100).toFixed(1)
        });
      }
    }

    return res.json({
      quiz: {
        id: quiz._id,
        question: quiz.question,
        type: quiz.type
      },
      results,
      stats: {
        totalAttempts: results.length,
        averageScore: results.reduce((acc, r) => acc + r.score, 0) / results.length || 0,
        passRate: (results.filter(r => r.passed).length / results.length * 100) || 0,
        averageTime: results.reduce((acc, r) => acc + r.timeSpent, 0) / results.length || 0,
        questionStats
      }
    });
  } catch (err) {
    console.error('getQuizResults error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 👤 Get user's result for a specific quiz
 * GET /api/quizzes/:quizId/results/me
 */
export const getMyQuizResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { quizId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await QuizResult.findOne({ user: userId, quiz: quizId }).lean();
    
    if (!result) {
      return res.status(404).json({ message: 'No result found for this quiz' });
    }

    return res.json(result);
  } catch (err) {
    console.error('getMyQuizResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📈 Get all quiz results for a specific user (Teacher/Admin)
 * GET /api/quizzes/results/user/:userId
 */
export const getUserQuizResults = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const results = await QuizResult.find({ user: userId })
      .populate('quiz', 'question type topic lesson')
      .sort({ completedAt: -1 })
      .lean();

    return res.json({
      userId,
      results,
      stats: {
        totalCompleted: results.length,
        averageScore: results.reduce((acc, r) => acc + r.score, 0) / results.length || 0,
        totalTimeSpent: results.reduce((acc, r) => acc + r.timeSpent, 0),
        passedQuizzes: results.filter(r => r.passed).length,
        passRate: (results.filter(r => r.passed).length / results.length * 100) || 0
      }
    });
  } catch (err) {
    console.error('getUserQuizResults error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get quiz analytics for a topic (Teacher/Admin)
 * GET /api/quizzes/analytics/topic/:topicId
 */
export const getTopicQuizAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;

    // Get all quizzes for this topic
    const quizzes = await Quiz.find({ topic: topicId }).lean();
    const quizIds = quizzes.map(q => q._id);

    // Get all results for these quizzes
    const results = await QuizResult.find({ quiz: { $in: quizIds } })
      .populate('user', 'email nickname')
      .populate('quiz', 'question type')
      .lean();

    return res.json({
      topicId,
      quizzesCount: quizzes.length,
      totalAttempts: results.length,
      stats: {
        averageScore: results.reduce((acc, r) => acc + r.score, 0) / results.length || 0,
        passRate: (results.filter(r => r.passed).length / results.length * 100) || 0,
        averageTime: results.reduce((acc, r) => acc + r.timeSpent, 0) / results.length || 0
      },
      results: results.slice(0, 20) // Latest 20 results
    });
  } catch (err) {
    console.error('getTopicQuizAnalytics error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 🗑️ Delete quiz result (Admin only)
 * DELETE /api/quizzes/results/:resultId
 */
export const deleteQuizResult = async (req: AuthRequest, res: Response) => {
  try {
    const { resultId } = req.params;

    const result = await QuizResult.findByIdAndDelete(resultId);
    
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    return res.json({ message: 'Quiz result deleted successfully' });
  } catch (err) {
    console.error('deleteQuizResult error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};










