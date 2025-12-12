import { authMiddleware, isTeacher } from "../middleware/auth";
import multer from "multer";
import path from "path";

import express from "express";
import mongoose from "mongoose";
import {
  createPracticeSet,
  listPracticeSets,
  getPracticeSet,
  deletePracticeSet,
} from "../controllers/practiceSetController";
import {
  listSections,
  getSection,
  updateSection,
} from "../controllers/practiceSectionController";
import {
  addPracticeItem,
  listPracticeItems,
  updatePracticeItem,
  deletePracticeItem,
} from "../controllers/practiceItemController";
import {
  getSubmissions,
  getSubmissionDetail,
  getLatestSubmission,
  deleteSubmission,
  submitPracticeSection,
  submitPracticeSet,
  getUserPracticeProgress,
  getPracticeLeaderboard,
} from "../controllers/practiceSubmissionController";
import { gradeSubmission } from "../controllers/practiceSubmissionController";

const router = express.Router();

/* ------------------- Helpers ------------------- */
const checkId =
  (name: "id" | "setId" | "sectionId" | "itemId") =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const v = (req.params as any)[name];
    if (!mongoose.isValidObjectId(v)) {
      return res.status(400).json({ message: `Invalid ${name}` });
    }
    next();
  };

// optional: validate examType query if present
const validateExamTypeQuery = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const et = (req.query as any)?.examType;
  if (et && et !== "ielts" && et !== "toeic") {
    return res.status(400).json({ message: "Invalid examType" });
  }
  next();
};

/* ---------------------- Sets ---------------------- */
// ĐẶT route cụ thể trước để tránh đè /sets/:id
// Hỗ trợ: GET /v2/practice/sets/published?examType=ielts|toeic
router.get("/sets/published", validateExamTypeQuery, (req, res) => {
  (req.query as any).status = "published"; // controller listPracticeSets sẽ đọc req.query
  return listPracticeSets(req, res);
});

router.post("/sets", createPracticeSet);

// Hỗ trợ filter: GET /v2/practice/sets?examType=...&status=...
router.get("/sets", validateExamTypeQuery, listPracticeSets);

router.get("/sets/:id", checkId("id"), getPracticeSet);
router.delete("/sets/:id", checkId("id"), deletePracticeSet);

/* -------------------- Sections -------------------- */
// GET /v2/practice/sets/:setId/sections           (optional ?skill=listening)
router.get("/sets/:setId/sections", checkId("setId"), listSections);

// Alias tiện cho mobile: GET /v2/practice/sets/:setId/sections/skill/:skill
// Tái dùng cùng controller listSections bằng cách gán req.query.skill
router.get("/sets/:setId/sections/skill/:skill", checkId("setId"), (req, res) => {
  (req.query as any).skill = req.params.skill;
  return listSections(req, res);
});

router.get("/sections/:sectionId", checkId("sectionId"), getSection);
router.patch("/sections/:sectionId", checkId("sectionId"), updateSection);

/* ---------------------- Items --------------------- */
router.post("/sections/:sectionId/items", checkId("sectionId"), addPracticeItem);
router.get("/sections/:sectionId/items", checkId("sectionId"), listPracticeItems);
router.put("/items/:itemId", checkId("itemId"), updatePracticeItem);
router.delete("/items/:itemId", checkId("itemId"), deletePracticeItem);

/* ------------------- Submissions ------------------ */
// Học viên nộp bài theo section hoặc set
router.post("/sections/:sectionId/submit", checkId("sectionId"), submitPracticeSection);
router.post("/sets/:setId/submit", checkId("setId"), submitPracticeSet);

// Học viên xem tiến độ và leaderboard
router.get("/progress/me", getUserPracticeProgress);
router.get("/sets/:setId/leaderboard", checkId("setId"), getPracticeLeaderboard);

/* ------------------- Teacher View ------------------ */
// Giảng viên xem danh sách bài nộp
// 👉 GET /api/v2/practice/submissions?sectionId=...&userId=...&skill=...
router.get("/submissions", getSubmissions);

// Giảng viên xem chi tiết bài nộp cụ thể
// 👉 GET /api/v2/practice/submissions/:id
router.get("/submissions/:id", getSubmissionDetail);

// Giảng viên xóa bài nộp
// 👉 DELETE /api/v2/practice/submissions/:id
router.delete("/submissions/:id", deleteSubmission);

// Giảng viên xem submission mới nhất của học viên cho một section
// 👉 GET /api/v2/practice/submissions/latest?userId=xxx&sectionId=xxx
router.get("/submissions/latest", getLatestSubmission);

router.put(
  "/submissions/:id/grade",
  authMiddleware,
  isTeacher,
  gradeSubmission
);

/* ------------------- Speaking Upload ------------------ */

// Thư mục lưu file tạm thời, bạn có thể đổi sang Cloudinary hoặc S3 sau
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/speaking/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // tối đa 20MB
  fileFilter: (req, file, cb) => {
    // Chấp nhận nhiều mimetype cho audio
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/x-m4a",
      "audio/mp4",
      "audio/x-mp4",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
    ];
    
    // Kiểm tra mimetype
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    
    // Nếu mimetype không khớp, kiểm tra extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm", ".mp4"];
    
    if (allowedExtensions.includes(ext)) {
      return cb(null, true);
    }
    
    return cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(", ")}`));
  },
});

// ✅ Route upload file Speaking
router.post(
  "/upload/speaking",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được tải lên" });
    }

    const fileUrl = `/uploads/speaking/${req.file.filename}`;
    return res.json({
      message: "Tải file Speaking thành công",
      url: fileUrl,
    });
  }
);


export default router;
