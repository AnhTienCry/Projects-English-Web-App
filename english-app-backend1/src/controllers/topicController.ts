import { Request, Response } from "express";
import Topic from "../models/Topic";


/**
 * Lấy 1 Topic theo ID
 * GET /api/topics/detail/:id
 */
export async function getTopicById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const topic = await Topic.findById(id)
      .populate('lessonId', 'title level')
      .lean();
    if (!topic) return res.status(404).json({ error: { message: "Topic not found" } });
    res.json(topic);
  } catch (err) {
    console.error("getTopicById error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Lấy tất cả Topics
 * GET /api/topics
 */
export async function getAllTopics(req: Request, res: Response) {
  try {
    const topics = await Topic.find({})
      .populate('lessonId', 'title level')
      .sort({ order: 1 })
      .lean();
    res.json(topics);
  } catch (err) {
    console.error("getAllTopics error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Lấy danh sách Topic theo Lesson
 * GET /api/topics/:lessonId
 */
export async function getTopicsByLesson(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const topics = await Topic.find({ lessonId }).sort({ order: 1 }).lean();
    res.json(topics);
  } catch (err) {
    console.error("getTopicsByLesson error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Tạo Topic mới
 * POST /api/topics
 */
export async function createTopic(req: Request, res: Response) {
  try {
    const { lessonId, storyId, title, description, order, isPublished } = req.body;
    if (!lessonId || !title)
      return res.status(400).json({ error: { message: "lessonId & title required" } });

    // Create topic without storyId - story will be created manually later
    // Similar to vocab, quizzes, videos - story is a separate entity
    const topic = await Topic.create({ 
      lessonId, 
      storyId: storyId || undefined, // Only set if provided, otherwise leave undefined
      title, 
      description, 
      order: order || 1,
      isPublished: isPublished !== undefined ? isPublished : true
    });

    res.status(201).json(topic);
  } catch (err) {
    console.error("createTopic error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Cập nhật Topic
 * PUT /api/topics/:id
 */
export async function updateTopic(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await Topic.findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: { message: "Topic not found" } });
    res.json(updated);
  } catch (err) {
    console.error("updateTopic error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Xóa Topic
 * DELETE /api/topics/:id
 */
export async function deleteTopic(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await Topic.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ error: { message: "Topic not found" } });
    res.status(204).end();
  } catch (err) {
    console.error("deleteTopic error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}

/**
 * Đổi trạng thái xuất bản
 * PATCH /api/topics/:id/publish
 */
export async function togglePublish(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const topic = await Topic.findById(id);
    if (!topic) return res.status(404).json({ error: { message: "Topic not found" } });

    topic.isPublished = !topic.isPublished;
    await topic.save();
    res.json({ id: topic._id, isPublished: topic.isPublished });
  } catch (err) {
    console.error("togglePublish error:", err);
    res.status(500).json({ error: { message: "Server error" } });
  }
}
