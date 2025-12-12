import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizResult extends Document {
  user: mongoose.Types.ObjectId;
  quiz: mongoose.Types.ObjectId;
  answers: Array<{
    questionIndex: number;
    selectedAnswer: number;
    isCorrect: boolean;
  }>;
  score: number; // percentage
  timeSpent: number; // in seconds
  passed: boolean;
  completedAt: Date;
}

const QuizResultSchema = new Schema<IQuizResult>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [{
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  score: { type: Number, required: true },
  timeSpent: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  completedAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate quiz attempts
QuizResultSchema.index({ user: 1, quiz: 1 }, { unique: true });

export default mongoose.models.QuizResult || mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);



