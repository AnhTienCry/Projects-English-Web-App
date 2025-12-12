import mongoose, { Schema, Document } from 'mongoose';

export interface ILessonResult extends Document {
  userId: string;
  lessonId: string;
  score: number; // Điểm số đạt được (0-100)
  isPassed: boolean;
  timeSpent: number; // Thời gian hoàn thành (in minutes)
  answers: {
    reading: {
      highlightedWordsClicked: string[]; // Các từ đã click để xem dịch
      timeSpent: number;
    };
    listening: {
      questions: {
        questionId: string;
        userAnswer: string;
        isCorrect: boolean;
        timeSpent: number;
      }[];
      totalTimeSpent: number;
    };
    quiz: {
      questions: {
        questionId: string;
        userAnswer: string;
        isCorrect: boolean;
        timeSpent: number;
      }[];
      totalTimeSpent: number;
    };
  };
  completedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const LessonResultSchema = new Schema<ILessonResult>({
  userId: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  lessonId: { 
    type: String, 
    required: true,
    ref: 'Lesson'
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  isPassed: { type: Boolean, required: true },
  timeSpent: { type: Number, required: true }, // in minutes
  answers: {
    reading: {
      highlightedWordsClicked: [{ type: String }],
      timeSpent: { type: Number, default: 0 }
    },
    listening: {
      questions: [{
        questionId: { type: String, required: true },
        userAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        timeSpent: { type: Number, default: 0 }
      }],
      totalTimeSpent: { type: Number, default: 0 }
    },
    quiz: {
      questions: [{
        questionId: { type: String, required: true },
        userAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        timeSpent: { type: Number, default: 0 }
      }],
      totalTimeSpent: { type: Number, default: 0 }
    }
  },
  completedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
LessonResultSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonResultSchema.index({ userId: 1, completedAt: -1 });
LessonResultSchema.index({ lessonId: 1, score: -1 });
LessonResultSchema.index({ isPassed: 1 });

// Update the updatedAt field before saving
LessonResultSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.LessonResult || mongoose.model<ILessonResult>('LessonResult', LessonResultSchema);
