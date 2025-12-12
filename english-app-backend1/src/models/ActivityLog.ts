import { Schema, model, Document, Types } from "mongoose";
import mongoose from "mongoose";

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  date: Date; // Ngày học (chỉ lưu date, không có time)
  activities: {
    type: string; // 'lesson', 'topic', 'quiz', 'tower'
    id: string;
    completedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    activities: [{
      type: { type: String, required: true },
      id: { type: String, required: true },
      completedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Index để query nhanh theo userId và date
ActivityLogSchema.index({ userId: 1, date: -1 });
ActivityLogSchema.index({ userId: 1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

