import mongoose, { Schema, Document } from "mongoose";

export interface ITopic extends Document {
  lessonId: mongoose.Types.ObjectId;
  storyId?: mongoose.Types.ObjectId; // Optional - will be created manually later
  title: string;
  description?: string;
  order?: number;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    storyId: { type: Schema.Types.ObjectId, ref: "Story", required: false }, // Optional - created manually
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Topic || mongoose.model<ITopic>("Topic", TopicSchema);
