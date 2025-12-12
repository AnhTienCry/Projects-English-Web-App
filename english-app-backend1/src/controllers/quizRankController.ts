import { Request, Response } from 'express';
import QuizRankLesson from '../models/QuizRankLesson';
import Quiz from '../models/Quiz';
import LessonResult from '../models/LessonResult';
import { AuthRequest } from '../middleware/auth';

/**
 * 📋 Get all quiz rank lessons with user progress
 * GET /api/quiz-rank/lessons
 * Public endpoint (optional auth for progress)
 */
export const getAllQuizRankLessons = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    
    const lessons = await QuizRankLesson.find()
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .sort({ createdAt: 1 }) // Sắp xếp: bài tạo trước ở trước, bài tạo sau ở sau
      .lean();

    // Nếu có user, load progress từ LessonResult
    if (userId) {
      const lessonIds = lessons.map((l: any) => l._id.toString());
      const lessonResults = await LessonResult.find({
        userId,
        lessonId: { $in: lessonIds }
      }).lean();

      // Tạo map để lookup nhanh
      const resultMap = new Map();
      lessonResults.forEach((lr: any) => {
        resultMap.set(lr.lessonId.toString(), lr);
      });

      // Merge progress vào lessons
      lessons.forEach((lesson: any) => {
        const lessonId = lesson._id.toString();
        const result = resultMap.get(lessonId);
        
        if (result) {
          lesson.percent = result.score;
          lesson.isCompleted = result.isPassed;
        } else {
          lesson.percent = 0;
          lesson.isCompleted = false;
        }
      });
    } else {
      // No user - set default values
      lessons.forEach((lesson: any) => {
        lesson.percent = 0;
        lesson.isCompleted = false;
      });
    }

    return res.json(lessons);
  } catch (err) {
    console.error('getAllQuizRankLessons error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📋 Get a single quiz rank lesson by ID
 * GET /api/quiz-rank/lessons/:id
 * Public endpoint (optional auth for progress)
 */
export const getQuizRankLessonById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    
    const lesson = await QuizRankLesson.findById(id)
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .lean();

    if (!lesson) {
      return res.status(404).json({ message: 'Quiz rank lesson not found' });
    }

    // Load progress if user is authenticated
    if (userId) {
      const lessonResult: any = await LessonResult.findOne({
        userId,
        lessonId: id
      }).lean();

      if (lessonResult) {
        (lesson as any).percent = lessonResult.score;
        (lesson as any).isCompleted = lessonResult.isPassed;
      } else {
        (lesson as any).percent = 0;
        (lesson as any).isCompleted = false;
      }
    } else {
      (lesson as any).percent = 0;
      (lesson as any).isCompleted = false;
    }

    return res.json(lesson);
  } catch (err) {
    console.error('getQuizRankLessonById error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * ➕ Create a new quiz rank lesson
 * POST /api/quiz-rank/lessons
 */
export const createQuizRankLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { title, quizzes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Validate quiz IDs if provided
    if (quizzes && Array.isArray(quizzes) && quizzes.length > 0) {
      const validQuizzes = await Quiz.find({ _id: { $in: quizzes } });
      if (validQuizzes.length !== quizzes.length) {
        return res.status(400).json({ message: 'Some quiz IDs are invalid' });
      }
    }

    const lesson = await QuizRankLesson.create({
      title: title.trim(),
      quizzes: quizzes || [],
    });

    const populated = await QuizRankLesson.findById(lesson._id)
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .lean();

    return res.status(201).json(populated);
  } catch (err) {
    console.error('createQuizRankLesson error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * ✏️ Update a quiz rank lesson
 * PUT /api/quiz-rank/lessons/:id
 */
export const updateQuizRankLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, quizzes } = req.body;

    const lesson = await QuizRankLesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ message: 'Quiz rank lesson not found' });
    }

    // Update title if provided
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      lesson.title = title.trim();
    }

    // Update quizzes if provided
    if (quizzes !== undefined) {
      if (Array.isArray(quizzes)) {
        // Validate quiz IDs if provided
        if (quizzes.length > 0) {
          const validQuizzes = await Quiz.find({ _id: { $in: quizzes } });
          if (validQuizzes.length !== quizzes.length) {
            return res.status(400).json({ message: 'Some quiz IDs are invalid' });
          }
        }
        lesson.quizzes = quizzes;
      } else {
        return res.status(400).json({ message: 'Quizzes must be an array' });
      }
    }

    await lesson.save();

    const populated = await QuizRankLesson.findById(lesson._id)
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .lean();

    return res.json(populated);
  } catch (err) {
    console.error('updateQuizRankLesson error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 🗑️ Delete a quiz rank lesson
 * DELETE /api/quiz-rank/lessons/:id
 */
export const deleteQuizRankLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await QuizRankLesson.findByIdAndDelete(id);

    if (!lesson) {
      return res.status(404).json({ message: 'Quiz rank lesson not found' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('deleteQuizRankLesson error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get quiz rank configuration (for backward compatibility)
 * GET /api/quiz-rank?lessonId=xxx
 */
export const getQuizRank = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.query;

    if (lessonId) {
      // Get quizzes for a specific lesson
      const lesson = await QuizRankLesson.findById(lessonId)
        .populate('quizzes', 'question title type options correctAnswer explanation pairs')
        .lean();

      if (!lesson) {
        return res.status(404).json({ message: 'Quiz rank lesson not found' });
      }

      const lessonData: any = lesson;
      return res.json({
        lessonId: lessonData._id,
        title: lessonData.title,
        quizzes: lessonData.quizzes,
        selections: (lessonData.quizzes || []).map((q: any) => q._id.toString()),
      });
    }

    // Default: return empty or first lesson
    const firstLesson = await QuizRankLesson.findOne()
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .sort({ createdAt: 1 }) // Sắp xếp: bài tạo trước ở trước
      .lean();

    if (!firstLesson) {
      return res.json({
        quizzes: [],
        selections: [],
      });
    }

    const firstLessonData: any = firstLesson;
    return res.json({
      lessonId: firstLessonData._id,
      title: firstLessonData.title,
      quizzes: firstLessonData.quizzes,
      selections: (firstLessonData.quizzes || []).map((q: any) => q._id.toString()),
    });
  } catch (err) {
    console.error('getQuizRank error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 💾 Update quiz rank configuration (for backward compatibility)
 * PUT /api/quiz-rank
 */
export const updateQuizRank = async (req: AuthRequest, res: Response) => {
  try {
    const { quizzes } = req.body;

    if (!Array.isArray(quizzes)) {
      return res.status(400).json({ message: 'Quizzes must be an array' });
    }

    // Validate quiz IDs
    if (quizzes.length > 0) {
      const validQuizzes = await Quiz.find({ _id: { $in: quizzes } });
      if (validQuizzes.length !== quizzes.length) {
        return res.status(400).json({ message: 'Some quiz IDs are invalid' });
      }
    }

    // Get or create default lesson
    let lesson = await QuizRankLesson.findOne({ title: 'Default Quiz Rank' });
    
    if (!lesson) {
      lesson = await QuizRankLesson.create({
        title: 'Default Quiz Rank',
        quizzes: quizzes,
      });
    } else {
      lesson.quizzes = quizzes;
      await lesson.save();
    }

    const populated = await QuizRankLesson.findById(lesson._id)
      .populate('quizzes', 'question title type options correctAnswer explanation pairs')
      .lean();

    return res.json(populated);
  } catch (err) {
    console.error('updateQuizRank error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

