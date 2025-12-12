import mongoose, { Schema, Document } from "mongoose";

export interface IQuiz extends Document {
  lesson?: mongoose.Types.ObjectId;
  topic?: mongoose.Types.ObjectId;
  question: string;
  type: "multiple_choice" | "fill_blank" | "true_false" | "matching";
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  timeLimit?: number;
  passingScore?: number;
  isActive?: boolean;
  pairs?: { left: string; right: string }[];  // ✅ thêm dòng này
  createdAt?: Date;
  updatedAt?: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    question: { type: String, required: true },

    type: {
      type: String,
      enum: ["multiple_choice", "fill_blank", "true_false", "matching"],
      default: "multiple_choice",
    },

    options: [{ type: String }],
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String },

    timeLimit: { type: Number },
    passingScore: { type: Number },
    isActive: { type: Boolean, default: true },

    // ✅ thêm block này để lưu danh sách ghép cặp
    pairs: [
      {
        left: { type: String },
        right: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);
