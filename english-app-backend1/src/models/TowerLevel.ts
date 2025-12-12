import mongoose, { Schema, Document } from "mongoose";

/**
 * Mô hình tầng (Tower Level) trong hệ thống Leo Tháp
 * -------------------------------------------------
 * Mỗi tầng chứa danh sách quiz, điểm thưởng, huy hiệu, mô tả, ...
 */
export interface ITowerLevel extends Document {
  levelNumber: number;                    // Số thứ tự tầng
  title: string;                          // Tiêu đề tầng
  description?: string;                   // Mô tả (tùy chọn)
  rewardPoints?: number;                  // Điểm thưởng khi vượt tầng
  rewardBadge?: mongoose.Types.ObjectId | string; // Huy hiệu thưởng (Badge ID)
  passingScore?: number;                  // Điểm đạt để qua tầng (mặc định 60%)
  quizzes: mongoose.Types.ObjectId[];     // Danh sách quiz thuộc tầng
  isActive: boolean;                      // Bật/tắt tầng
  createdAt?: Date;
  updatedAt?: Date;
}

const TowerLevelSchema = new Schema<ITowerLevel>(
  {
    levelNumber: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    rewardPoints: { type: Number, default: 50 },
    rewardBadge: { type: Schema.Types.ObjectId, ref: "Badge" },
    passingScore: { type: Number, default: 60 }, // ✅ Thêm trường này
    quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index đã được tạo tự động bởi unique: true trên levelNumber

export default mongoose.models.TowerLevel ||
  mongoose.model<ITowerLevel>("TowerLevel", TowerLevelSchema);
