import { Schema, model } from "mongoose";

const PracticeSubmissionSchema = new Schema(
  {
    // 🧑‍🎓 Học viên nộp bài (liên kết User để populate nickname/email)
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Loại bài thi & kỹ năng
    examType: {
      type: String,
      enum: ["toeic", "ielts"],
      required: true,
    },
    skill: {
      type: String,
      enum: ["listening", "reading", "writing", "speaking"],
      required: true,
    },

    // Bộ đề & section
    setId: { type: Schema.Types.ObjectId, ref: "PracticeSet", required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "PracticeSection" }, // null nếu nộp cả set

    // ✅ Danh sách câu trả lời
    answers: [
      new Schema(
        {
          itemId: {
            type: Schema.Types.ObjectId,
            ref: "PracticeItem",
            required: true,
          },
          payload: Schema.Types.Mixed, // nội dung học viên nộp
          correct: { type: Boolean, default: null },
          expected: [String],
          explanation: String,
          type: String,
          timeSpentMs: Number,

          audioUrl: String, // link file ghi âm học viên
          transcription: String, // nếu bạn muốn lưu text giọng nói sau này
        },
        { _id: false }
      ),
    ],

    // ✅ Điểm tự động hệ thống tính (nếu có)
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    durationSec: Number,

    analytics: {
      accuracy: Number,
      avgTimePerItemMs: Number,
      byType: Schema.Types.Mixed, // { mcq: 0.9, gap: 0.8, ... }
    },

    /* 🧑‍🏫 Phần dành cho giáo viên chấm Writing / Speaking */
    teacherScore: {
      type: Number,
      default: null, // null nếu chưa chấm
    },
    teacherFeedback: {
      type: String,
      default: "",
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // giáo viên chấm
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "practice_submissions",
  }
);

// ✅ Tối ưu query
PracticeSubmissionSchema.index({
  userId: 1,
  setId: 1,
  sectionId: 1,
  createdAt: -1,
});

export default model("PracticeSubmission", PracticeSubmissionSchema);
