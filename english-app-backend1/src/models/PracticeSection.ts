import { Schema, model } from "mongoose";

const PracticeSectionSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, ref: "PracticeSet", required: true },
    skill: { type: String, enum: ["listening", "reading", "writing", "speaking"], required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },

    // Listening config
    audioUrl: String,
    transcript: String,
    transcriptMode: { type: String, enum: ["never", "afterFirstEnd", "always"], default: "afterFirstEnd" },
    maxReplay: { type: Number, default: 2 },
    timestamps: [{ start: Number, end: Number, text: String }],

    // Link items
    items: [{ type: Schema.Types.ObjectId, ref: "PracticeItem" }],
  },
  { timestamps: true, collection: "practice_sections" }
);

PracticeSectionSchema.index({ setId: 1, skill: 1 }, { unique: true }); // 1 skill/section per set
PracticeSectionSchema.index({ setId: 1, order: 1 });

export default model("PracticeSection", PracticeSectionSchema);
