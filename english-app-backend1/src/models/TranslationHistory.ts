import mongoose, { Schema, Document } from 'mongoose';

export interface ITranslationHistory extends Document {
  userId?: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationType: 'contextual' | 'manual' | 'vocab';
  context?: string; // Ngữ cảnh của từ/câu
  wordId?: string; // ID của từ vựng nếu là dịch từ vựng
  lessonId?: string; // ID của lesson nếu dịch trong lesson
  confidence?: number; // Độ tin cậy của bản dịch (0-1)
  isVocab: boolean;
  timestamp: Date;
  createdAt?: Date;
}

const TranslationHistorySchema = new Schema<ITranslationHistory>({
  userId: { 
    type: String, 
    ref: 'User'
  },
  originalText: { type: String, required: true },
  translatedText: { type: String, required: true },
  sourceLanguage: { type: String, required: true },
  targetLanguage: { type: String, required: true },
  translationType: { 
    type: String, 
    enum: ['contextual', 'manual', 'vocab'],
    required: true 
  },
  context: { type: String },
  wordId: { 
    type: String, 
    ref: 'Vocab' 
  },
  lessonId: { 
    type: String, 
    ref: 'Lesson' 
  },
  confidence: { type: Number, min: 0, max: 1 },
  isVocab: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
TranslationHistorySchema.index({ userId: 1, timestamp: -1 });
TranslationHistorySchema.index({ lessonId: 1 });
TranslationHistorySchema.index({ wordId: 1 });
TranslationHistorySchema.index({ translationType: 1 });
TranslationHistorySchema.index({ sourceLanguage: 1, targetLanguage: 1 });

export default mongoose.models.TranslationHistory || mongoose.model<ITranslationHistory>('TranslationHistory', TranslationHistorySchema);
