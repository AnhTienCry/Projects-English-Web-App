import { Schema, model, Document, Types } from "mongoose";
import mongoose from "mongoose";

export interface IUserProgress extends Document {
  userId: Types.ObjectId;
  totalScore: number;
  totalStudyTime: number;
  streak: number; // 🔥 số ngày học liên tiếp
  currentLesson?: string | null; // 🔥 bài học hiện tại
  completedLessons: string[];
  completedTopics: string[];
  completedTowerLevels: string[];
  lastActiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalScore: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    currentLesson: { type: String, default: null },

    // 🔗 Danh sách ID hoàn thành — luôn lưu dạng string
    completedLessons: { type: [String], default: [] },
    completedTopics: { type: [String], default: [] },
    completedTowerLevels: { type: [String], default: [] },

    // 🕒 Ngày hoạt động cuối cùng
    lastActiveDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ⚙️ Index tối ưu cho thống kê & tìm kiếm
UserProgressSchema.index({ userId: 1 });
UserProgressSchema.index({ lastActiveDate: -1 });

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>("UserProgress", UserProgressSchema);