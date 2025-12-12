import { Response } from 'express';
import Vocab from '../models/Vocab';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all vocabularies (with filters)
 * GET /api/vocab?lesson=xxx&level=A1&search=hello
 */
export const getAllVocabs = async (req: AuthRequest, res: Response) => {
  try {
    const { lesson, topic, level, search, page = 1, limit = 50 } = req.query;
    
    const filter: any = { isActive: true };
    
    if (lesson) filter.lesson = lesson;
    if (topic) filter.topic = topic;
    if (level) filter.level = level;
    if (search) {
      filter.$or = [
        { word: { $regex: search, $options: 'i' } },
        { meaning: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const vocabs = await Vocab.find(filter)
      .populate('lesson', 'title')
      .populate('topic', 'title')
      .populate('createdBy', 'nickname email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip)
      .lean();
    
    const total = await Vocab.countDocuments(filter);
    
    res.json({
      vocabs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('getAllVocabs error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Get vocabularies by lesson ID
 * GET /api/vocab/lesson/:lessonId
 */
export const getVocabsByLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    
    const vocabs = await Vocab.find({ lesson: lessonId, isActive: true })
      .sort({ createdAt: 1 })
      .lean();
    
    res.json(vocabs);
  } catch (err) {
    console.error('getVocabsByLesson error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Get vocabularies by topic ID
 * GET /api/vocab/topic/:topicId
 */
export const getVocabsByTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    
    const vocabs = await Vocab.find({ topic: topicId, isActive: true })
      .populate('topic', 'title')
      .sort({ createdAt: 1 })
      .lean();
    
    res.json(vocabs);
  } catch (err) {
    console.error('getVocabsByTopic error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Get a single vocabulary by ID
 * GET /api/vocab/:id
 */
export const getVocabById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const vocab = await Vocab.findById(id)
      .populate('lesson', 'title')
      .populate('topic', 'title')
      .populate('createdBy', 'nickname email')
      .lean();
    
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    res.json(vocab);
  } catch (err) {
    console.error('getVocabById error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Create new vocabulary (Teacher/Admin)
 * POST /api/vocab
 */
export const createVocab = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const vocabData = {
      ...req.body,
      createdBy: userId
    };
    
    const vocab = await Vocab.create(vocabData);
    
    res.status(201).json({
      message: 'Vocabulary created successfully',
      vocab
    });
  } catch (err) {
    console.error('createVocab error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Update vocabulary (Teacher/Admin)
 * PUT /api/vocab/:id
 */
export const updateVocab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const vocab = await Vocab.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    res.json({
      message: 'Vocabulary updated successfully',
      vocab
    });
  } catch (err) {
    console.error('updateVocab error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Delete vocabulary (Admin only)
 * DELETE /api/vocab/:id
 */
export const deleteVocab = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Soft delete
    const vocab = await Vocab.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    res.json({
      message: 'Vocabulary deleted successfully'
    });
  } catch (err) {
    console.error('deleteVocab error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * Bulk import vocabularies (Teacher/Admin)
 * POST /api/vocab/bulk-import
 */
export const bulkImportVocabs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const { vocabs } = req.body; // Array of vocab objects
    
    if (!Array.isArray(vocabs) || vocabs.length === 0) {
      return res.status(400).json({ message: 'Invalid data format' });
    }
    
    // Add createdBy to all vocabs
    const vocabsWithCreator = vocabs.map(v => ({
      ...v,
      createdBy: userId
    }));
    
    const result = await Vocab.insertMany(vocabsWithCreator);
    
    res.status(201).json({
      message: `Successfully imported ${result.length} vocabularies`,
      count: result.length,
      vocabs: result
    });
  } catch (err) {
    console.error('bulkImportVocabs error:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};