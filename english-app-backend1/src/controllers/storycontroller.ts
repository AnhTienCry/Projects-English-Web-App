import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Story from '../models/story';
import Vocabulary from '../models/Vocab';
import Topic from '../models/Topic';

export const storyController = {

  // === [GET] LẤY TẤT CẢ TRUYỆN (với số lượng vocab mỗi bài) ===
  getAllStories: async (req: Request, res: Response) => {
    try {
      const stories = await Story.find({})
        .populate<{ lesson: { _id: mongoose.Types.ObjectId; title: string; slug?: string } | null }>(
          'lesson',
          'title slug'
        )
        .populate<{ topic: { _id: mongoose.Types.ObjectId; title: string } | null }>(
          'topic',
          'title'
        )
        .select('content lesson topic updatedAt selectedVocabIds')
        .sort({ updatedAt: -1 })
        .lean();

      const lessonIds = stories
        .map((s) => s.lesson?._id)
        .filter((id): id is mongoose.Types.ObjectId => !!id);

      const topicIds = stories
        .map((s) => s.topic?._id)
        .filter((id): id is mongoose.Types.ObjectId => !!id);

      // Only count active vocabs to match what's displayed in vocabularies page
      const vocabCountsByLesson = await Vocabulary.aggregate([
        { $match: { lesson: { $in: lessonIds }, isActive: true } },
        { $group: { _id: '$lesson', count: { $sum: 1 } } },
      ]);

      const vocabCountsByTopic = await Vocabulary.aggregate([
        { $match: { topic: { $in: topicIds }, isActive: true } },
        { $group: { _id: '$topic', count: { $sum: 1 } } },
      ]);

      const vocabCountMapByLesson: Record<string, number> = {};
      vocabCountsByLesson.forEach((item) => {
        vocabCountMapByLesson[item._id.toString()] = item.count;
      });

      const vocabCountMapByTopic: Record<string, number> = {};
      vocabCountsByTopic.forEach((item) => {
        vocabCountMapByTopic[item._id.toString()] = item.count;
      });

      const storiesWithCounts = stories.map((story) => {
        let selectedVocabCount = story.selectedVocabIds?.length || 0;
        let totalVocabCount = 0;

        if (story.lesson) {
          const lessonIdStr = story.lesson._id.toString();
          totalVocabCount = vocabCountMapByLesson[lessonIdStr] || 0;
        } else if (story.topic) {
          // If story has topic but no lesson, count vocabs by topic
          const topicIdStr = story.topic._id.toString();
          totalVocabCount = vocabCountMapByTopic[topicIdStr] || 0;
        } else {
          selectedVocabCount = 0;
          totalVocabCount = 0;
        }

        return {
          ...story,
          selectedVocabCount,
          totalVocabCount,
        };
      });

      res.status(200).json(storiesWithCounts);
    } catch (error) {
      console.error('Lỗi trong getAllStories:', error);
      res
        .status(500)
        .json({ message: 'Lỗi máy chủ khi lấy danh sách truyện', error });
    }
  },

  // === [POST] TẠO TRUYỆN CHO 1 LESSON (CHỈ 1 LẦN DUY NHẤT) ===
  createStoryForLesson: async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content, selectedVocabIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ' });
    }

    try {
      const existing = await Story.findOne({ lesson: lessonId });
      if (existing) {
        return res.status(400).json({
          message:
            'Bài học này đã có truyện. Hãy xóa truyện cũ trước khi tạo mới.',
        });
      }

      const newStory = await Story.create({
        lesson: lessonId,
        content,
        selectedVocabIds: (selectedVocabIds || []).map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ),
      });

      res.status(201).json(newStory);
    } catch (error) {
      console.error('Lỗi khi tạo truyện:', error);
      res
        .status(500)
        .json({ message: 'Lỗi máy chủ khi tạo truyện', error });
    }
  },

  // === [POST] TẠO TRUYỆN CHO 1 TOPIC (CHỈ 1 LẦN DUY NHẤT) ===
  createStoryForTopic: async (req: Request, res: Response) => {
    const { topicId } = req.params;
    const { content, selectedVocabIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: 'topicId không hợp lệ' });
    }

    try {
      const existing = await Story.findOne({ topic: topicId });
      if (existing) {
        return res.status(400).json({
          message:
            'Topic này đã có truyện. Hãy xóa truyện cũ trước khi tạo mới.',
        });
      }

      // Get lessonId from topic
      const topicDoc = (await Topic.findById(topicId).lean()) as any;
      let lessonId = undefined;
      if (topicDoc && topicDoc.lessonId) {
        lessonId = typeof topicDoc.lessonId === 'object' 
          ? topicDoc.lessonId.toString() 
          : topicDoc.lessonId;
      }

      const newStory = await Story.create({
        lesson: lessonId, // Include lesson if available
        topic: topicId,
        content,
        selectedVocabIds: (selectedVocabIds || []).map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ),
      });

      res.status(201).json(newStory);
    } catch (error) {
      console.error('Lỗi khi tạo truyện:', error);
      res
        .status(500)
        .json({ message: 'Lỗi máy chủ khi tạo truyện', error });
    }
  },

  // === [PUT] CẬP NHẬT TRUYỆN THEO LESSON ===
  updateStoryByLessonId: async (req: Request, res: Response) => {
    const { lessonId } = req.params;
    const { content, selectedVocabIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ' });
    }

    try {
      const story = await Story.findOneAndUpdate(
        { lesson: new mongoose.Types.ObjectId(lessonId) },
        {
          content,
          selectedVocabIds: (selectedVocabIds || []).map(
            (id: string) => new mongoose.Types.ObjectId(id)
          ),
        },
        { new: true }
      );

      if (!story) {
        return res.status(404).json({
          message: 'Không tìm thấy truyện để cập nhật cho bài học này',
        });
      }

      res.status(200).json(story);
    } catch (error) {
      console.error('Lỗi khi cập nhật truyện:', error);
      res.status(500).json({
        message: 'Lỗi máy chủ khi cập nhật truyện',
        error,
      });
    }
  },

  // === [PUT] CẬP NHẬT TRUYỆN THEO TOPIC ===
  updateStoryByTopicId: async (req: Request, res: Response) => {
    const { topicId } = req.params;
    const { content, selectedVocabIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: 'topicId không hợp lệ' });
    }

    try {
      // Get lessonId from topic to ensure lesson is updated
      const topicDoc = (await Topic.findById(topicId).lean()) as any;
      let lessonId = undefined;
      if (topicDoc && topicDoc.lessonId) {
        lessonId = typeof topicDoc.lessonId === 'object' 
          ? topicDoc.lessonId.toString() 
          : topicDoc.lessonId;
      }

      const updateData: any = {
        content,
        selectedVocabIds: (selectedVocabIds || []).map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ),
      };

      // Include lesson if available
      if (lessonId) {
        updateData.lesson = lessonId;
      }

      const story = await Story.findOneAndUpdate(
        { topic: new mongoose.Types.ObjectId(topicId) },
        updateData,
        { new: true }
      );

      if (!story) {
        return res.status(404).json({
          message: 'Không tìm thấy truyện để cập nhật cho topic này',
        });
      }

      res.status(200).json(story);
    } catch (error) {
      console.error('Lỗi khi cập nhật truyện:', error);
      res.status(500).json({
        message: 'Lỗi máy chủ khi cập nhật truyện',
        error,
      });
    }
  },

  // === [GET] LẤY TRUYỆN THEO LESSON ID ===
  getStoryByLessonId: async (req: Request, res: Response) => {
    const { lessonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ' });
    }

    try {
      const story = await Story.findOne({
        lesson: new mongoose.Types.ObjectId(lessonId),
      })
        .populate('lesson', 'title')
        .populate('selectedVocabIds', 'word meaning phonetic partOfSpeech')
        .select('content lesson selectedVocabIds');

      if (!story) {
        return res.status(404).json({
          message: 'Không tìm thấy truyện cho bài học này',
          story: null,
        });
      }

      res.status(200).json(story);
    } catch (error) {
      console.error('Lỗi trong getStoryByLessonId:', error);
      res.status(500).json({
        message: 'Lỗi máy chủ khi lấy truyện',
        error,
      });
    }
  },

  // === [GET] LẤY TRUYỆN THEO TOPIC ID ===
  getStoryByTopicId: async (req: Request, res: Response) => {
    const { topicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: 'topicId không hợp lệ' });
    }

    try {
      const story = await Story.findOne({
        topic: new mongoose.Types.ObjectId(topicId),
      })
        .populate('topic', 'title')
        .populate('lesson', 'title')
        .populate('selectedVocabIds', 'word meaning phonetic partOfSpeech')
        .select('content topic lesson selectedVocabIds');

      if (!story) {
        return res.status(404).json({
          message: 'Không tìm thấy truyện cho topic này',
          story: null,
        });
      }

      res.status(200).json(story);
    } catch (error) {
      console.error('Lỗi trong getStoryByTopicId:', error);
      res.status(500).json({
        message: 'Lỗi máy chủ khi lấy truyện',
        error,
      });
    }
  },

  // === [DELETE] XÓA TRUYỆN THEO LESSON ID ===
  deleteStoryByLessonId: async (req: Request, res: Response) => {
    const { lessonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'lessonId không hợp lệ' });
    }

    try {
      const deletedStory = await Story.findOneAndDelete({
        lesson: new mongoose.Types.ObjectId(lessonId),
      });

      if (!deletedStory) {
        return res.status(404).json({ message: 'Không tìm thấy truyện để xóa' });
      }

      res.status(200).json({ message: 'Xóa truyện thành công' });
    } catch (error) {
      console.error('Lỗi khi xóa truyện:', error);
      res
        .status(500)
        .json({ message: 'Lỗi máy chủ khi xóa truyện', error });
    }
  },

  // === [DELETE] XÓA TRUYỆN THEO TOPIC ID ===
  deleteStoryByTopicId: async (req: Request, res: Response) => {
    const { topicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: 'topicId không hợp lệ' });
    }

    try {
      const deletedStory = await Story.findOneAndDelete({
        topic: new mongoose.Types.ObjectId(topicId),
      });

      if (!deletedStory) {
        return res.status(404).json({ message: 'Không tìm thấy truyện để xóa' });
      }

      res.status(200).json({ message: 'Xóa truyện thành công' });
    } catch (error) {
      console.error('Lỗi khi xóa truyện:', error);
      res
        .status(500)
        .json({ message: 'Lỗi máy chủ khi xóa truyện', error });
    }
  },
};




