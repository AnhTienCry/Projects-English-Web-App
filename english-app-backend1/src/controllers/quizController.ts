// controllers/quizController.ts
import { Request, Response } from "express";
import Quiz from "../models/Quiz";
import Topic from "../models/Topic";

/**
 * GET /api/quizzes?lesson=...&topic=...&q=...
 * Lấy danh sách quiz theo lesson/topic/search
 */
export async function getAllQuizzes(req: Request, res: Response) {
  try {
    const { lesson, topic, q } = req.query as any;
    const filter: any = {};

    if (lesson) filter.lesson = lesson;
    if (topic) filter.topic = topic;
    if (q) filter.question = { $regex: q, $options: "i" };

    const quizzes = await Quiz.find(filter)
      .populate('lesson', 'title level')
      .populate({
        path: 'topic',
        select: 'title lessonId',
        populate: {
          path: 'lessonId',
          select: 'title level'
        }
      })
      .lean();
    return res.json(quizzes);
  } catch (err) {
    console.error("getAllQuizzes error:", err);
    return res.status(500).json({ error: { message: "Failed to fetch quizzes" } });
  }
}

/**
 * GET /api/quizzes/topic/:topicId
 * Lấy danh sách quiz theo Topic
 */
export async function getQuizzesByTopic(req: Request, res: Response) {
  try {
    const { topicId } = req.params;
    const quizzes = await Quiz.find({ topic: topicId }).sort({ createdAt: 1 }).lean();
    return res.json(quizzes);
  } catch (err) {
    console.error("getQuizzesByTopic error:", err);
    return res.status(500).json({ error: { message: "Failed to fetch quizzes by topic" } });
  }
}

/**
 * GET /api/quizzes/lesson/:lessonId
 * Lấy danh sách quiz theo Lesson
 */
export async function getQuizzesByLesson(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const quizzes = await Quiz.find({ lesson: lessonId }).sort({ createdAt: 1 }).lean();
    return res.json(quizzes);
  } catch (err) {
    console.error("getQuizzesByLesson error:", err);
    return res.status(500).json({ error: { message: "Failed to fetch quizzes by lesson" } });
  }
}

/**
 * POST /api/quizzes
 * Tạo quiz mới (có hỗ trợ topic + nhiều loại câu hỏi)
 */
export async function createQuiz(req: Request, res: Response) {
  try {
    const {
      lesson,
      topic,
      question,
      type = "multiple_choice",
      options,
      correctAnswer,
      explanation,
      timeLimit,
      passingScore,
      description,
    } = req.body;

    // ✅ Kiểm tra dữ liệu bắt buộc
    if (!topic || !question || correctAnswer === undefined) {
      return res.status(400).json({
        error: { message: "topic, question và correctAnswer là bắt buộc" },
      });
    }

    // ✅ Chuẩn hóa options (nếu gửi dưới dạng string CSV)
    let parsedOptions: string[] | undefined = undefined;
    if (type === "multiple_choice" && options) {
      if (Array.isArray(options)) parsedOptions = options;
      else if (typeof options === "string")
        parsedOptions = options.split(",").map((o: string) => o.trim());
    }

    // ✅ Chuẩn hóa correctAnswer
    let parsedAnswer: any = correctAnswer;
    if (Array.isArray(correctAnswer)) {
      parsedAnswer = correctAnswer;
    } else if (typeof correctAnswer === "string" && correctAnswer.includes(",")) {
      parsedAnswer = correctAnswer.split(",").map((s) => s.trim());
    }

    // ✅ Xử lý đặc biệt cho loại "matching"
    let pairs: { left: string; right: string }[] | undefined = undefined;
    if (type === "matching" && typeof correctAnswer === "string") {
      const lines = correctAnswer
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      pairs = lines.map((line) => {
        const [left, right] = line.split("=").map((x) => x.trim());
        return { left, right };
      });
    }


    // ✅ Tạo quiz mới
    // If topic is provided, get its lessonId from Topic model
    let finalLessonId = lesson;
    if (topic && !lesson) {
      const topicDoc = (await Topic.findById(topic).lean()) as any;
      if (topicDoc && topicDoc.lessonId) {
        finalLessonId = typeof topicDoc.lessonId === 'object' 
          ? topicDoc.lessonId.toString() 
          : topicDoc.lessonId;
      }
    }

    const quiz = await Quiz.create({
      lesson: finalLessonId, // Include lesson if available
      topic,
      question,
      type,
      options: parsedOptions,
      correctAnswer: parsedAnswer,
      explanation,
      timeLimit,
      passingScore,
      description,
      pairs,
    });

    return res.status(201).json(quiz);
  } catch (err: any) {
    console.error("❌ createQuiz error:", err.message || err);
    return res.status(500).json({ error: { message: "Failed to create quiz" } });
  }
}

/**
 * PUT /api/quizzes/:id
 */
export async function updateQuiz(req: Request, res: Response) {
  try {
    const updated = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: { message: "Quiz not found" } });
    return res.json(updated);
  } catch (err) {
    console.error("updateQuiz error:", err);
    return res.status(500).json({ error: { message: "Failed to update quiz" } });
  }
}

/**
 * DELETE /api/quizzes/:id
 */
export async function deleteQuiz(req: Request, res: Response) {
  try {
    const deleted = await Quiz.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: { message: "Quiz not found" } });
    return res.status(204).send();
  } catch (err) {
    console.error("deleteQuiz error:", err);
    return res.status(500).json({ error: { message: "Failed to delete quiz" } });
  }
}
