import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizRankLesson extends Document {
  title: string;
  quizzes: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const QuizRankLessonSchema = new Schema<IQuizRankLesson>(
  {
    title: { type: String, required: true, trim: true },
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
  },
  { timestamps: true }
);

// Index for efficient queries
QuizRankLessonSchema.index({ title: 1 });
QuizRankLessonSchema.index({ createdAt: -1 });

export default mongoose.models.QuizRankLesson || mongoose.model<IQuizRankLesson>('QuizRankLesson', QuizRankLessonSchema);


























