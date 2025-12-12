import { Schema, model } from "mongoose";

const PracticeSetSchema = new Schema(
  {
    examType: { type: String, enum: ["toeic", "ielts"], required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ["draft", "review", "published"], default: "draft" },
  },
  { timestamps: true, collection: "practice_sets" }
);

PracticeSetSchema.index({ examType: 1, status: 1, createdAt: -1 });

export default model("PracticeSet", PracticeSetSchema);
