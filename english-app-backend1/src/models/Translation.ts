import mongoose, { Document, Schema } from 'mongoose';

export interface ITranslation extends Document {
  userId?: mongoose.Types.ObjectId;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: Date;
  isVocab?: boolean;
  wordId?: mongoose.Types.ObjectId;
}

const translationSchema = new Schema<ITranslation>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  originalText: { 
    type: String, 
    required: true 
  },
  translatedText: { 
    type: String, 
    required: true 
  },
  sourceLanguage: { 
    type: String, 
    required: true 
  },
  targetLanguage: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  isVocab: { 
    type: Boolean, 
    default: false 
  },
  wordId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vocab' 
  }
});

// Index for better query performance
translationSchema.index({ userId: 1, timestamp: -1 });
translationSchema.index({ sourceLanguage: 1, targetLanguage: 1 });

export default mongoose.models.Translation || mongoose.model<ITranslation>('Translation', translationSchema);

