import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtitleSegment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string; // English text
  translation?: string; // Vietnamese translation
}

export interface IWordDefinition {
  word: string;
  pronunciation: {
    us: string; // US pronunciation
    uk: string; // UK pronunciation
  };
  definitions: {
    partOfSpeech: string; // noun, verb, adjective, etc.
    meaning: string; // Vietnamese meaning
    example?: string; // Example sentence
  }[];
  cefrLevel?: string; // A1, A2, B1, B2, C1, C2
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface IVideo extends Document {
  title: string;
  description?: string;
  lesson?: mongoose.Types.ObjectId;
  topic?: mongoose.Types.ObjectId;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  transcript?: string;
  subtitles?: ISubtitleSegment[]; // Enhanced subtitles with timing
  wordDefinitions?: IWordDefinition[]; // Dictionary for words in video
  isActive: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubtitleSegmentSchema = new Schema({
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  text: { type: String, required: true },
  translation: { type: String }
});

const WordDefinitionSchema = new Schema({
  word: { type: String, required: true },
  pronunciation: {
    us: { type: String, required: true },
    uk: { type: String, required: true }
  },
  definitions: [{
    partOfSpeech: { type: String, required: true },
    meaning: { type: String, required: true },
    example: { type: String }
  }],
  cefrLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
});

const VideoSchema = new Schema<IVideo>({
  title: { type: String, required: true },
  description: { type: String },
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  duration: { type: Number }, // in seconds
  transcript: { type: String },
  subtitles: [SubtitleSegmentSchema], // Enhanced subtitles with timing
  wordDefinitions: [WordDefinitionSchema], // Dictionary for words in video
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
VideoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);



