import mongoose, { Schema, Document } from "mongoose";

export interface IRank extends Document {
  userId: mongoose.Types.ObjectId;
  points: number;
  level: number;
  completedLessons: number;
  updatedAt: Date;
}

const rankSchema = new Schema<IRank>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  completedLessons: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Rank || mongoose.model<IRank>("Rank", rankSchema);
