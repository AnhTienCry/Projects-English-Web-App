import { Schema, model } from "mongoose";

const PracticeItemSchema = new Schema(
  {
    // Giữ setId cho legacy (KHÔNG required, KHÔNG unique)
    setId: { type: Schema.Types.ObjectId, ref: "PracticeSet" },

    // Chuẩn mới
    sectionId: { type: Schema.Types.ObjectId, ref: "PracticeSection", required: true },
    order: { type: Number, required: true },

    // Question
    type: {
  type: String,
  enum: [
    "mcq",
    "gap",
    "truefalse",
    "yesno_ng",
    "matching",
    "heading",
    "speaking", 
  ],
  required: true,
},

    prompt: { type: String, required: true },
    options: [String],      // MCQ/Heading
    answers: [String],      // MCQ/Heading/Gap (nhiều đáp án đúng)
    explanation: String,

    // Reading extras
    snippet: String,

    // TF / YN
    polarity: { type: String, enum: ["tf", "yn"] },              // optional
    answerBool: { type: String, enum: ["true", "false", "not_given"] },

    // Gap
    strict: Boolean,

    // Matching
    pairs: [{ left: String, right: String }],
  },
  { timestamps: true, collection: "practice_items" }
);

// ✅ Unique theo section
PracticeItemSchema.index({ sectionId: 1, order: 1 }, { unique: true });

export default model("PracticeItem", PracticeItemSchema);
