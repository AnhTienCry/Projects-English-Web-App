import express from "express";
import { authMiddleware } from "../middleware/auth";

// ⬇️ Controller handlers ghi nhận kết quả sau khi Multer đã lưu file
// - uploadUserAvatar: trả về url ảnh avatar
// - uploadPracticeAudio: trả về url audio để gắn vào section Listening
// - uploadPracticeSpeaking: trả về url speaking để gắn vào câu trả lời học viên
import {
  uploadUserAvatar,
  uploadPracticeAudio,
  uploadPracticeSpeaking,
} from "../controllers/uploadController";

// ⬇️ Multer middlewares: thực hiện lưu file vật lý vào /uploads/*
// - uploadAvatar           -> /uploads/avatars
// - uploadListeningAudio   -> /uploads/audio
// - uploadSpeakingAudio    -> /uploads/speaking
import {
  uploadAvatar,
  uploadListeningAudio,
  uploadSpeakingAudio,
} from "../middleware/upload";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* 📸 Upload avatar (YÊU CẦU ĐĂNG NHẬP)
   - form-data key: "avatar"
   - middleware: uploadAvatar (multer)
   - controller: uploadUserAvatar (trả về { url })
/* -------------------------------------------------------------------------- */
router.post("/avatar", authMiddleware, uploadAvatar, uploadUserAvatar);

/* -------------------------------------------------------------------------- */
/* 🎧 Upload audio cho LISTENING (KHÔNG bắt buộc đăng nhập)
   - form-data key: "file"
   - middleware: uploadListeningAudio (multer -> /uploads/audio)
   - controller: uploadPracticeAudio (trả về { url })
/* -------------------------------------------------------------------------- */
router.post("/audio", uploadListeningAudio, uploadPracticeAudio);

/* -------------------------------------------------------------------------- */
/* 🎙️ Upload audio cho SPEAKING (KHÔNG bắt buộc đăng nhập)
   - form-data key: "file"
   - middleware: uploadSpeakingAudio (multer -> /uploads/speaking)
   - controller: uploadPracticeSpeaking (trả về { url })
/* -------------------------------------------------------------------------- */
router.post("/speaking", uploadSpeakingAudio, uploadPracticeSpeaking);

export default router;
