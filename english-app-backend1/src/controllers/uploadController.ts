import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import fs from "fs";
import path from "path";
import multer from "multer";

/* =========================================================
 * 🧩 Helpers
 * ========================================================= */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const ROOT_UPLOAD = path.join(process.cwd(), "uploads");

/* =========================================================
 * 📁 SAFE FILENAME — Giữ nguyên .mp3, bỏ dấu tiếng Việt & ký tự lạ
 * ========================================================= */
const safeFilename = (originalName: string) => {
  let ext = path.extname(originalName);
  let base = path.basename(originalName, ext);

  // 🔧 Fix: nếu client gửi thiếu dấu chấm .mp3 => tự thêm lại cho chắc
  if (!ext && originalName.toLowerCase().endsWith("mp3")) ext = ".mp3";
  else if (!ext && originalName.toLowerCase().endsWith("wav")) ext = ".wav";
  else if (!ext && originalName.toLowerCase().endsWith("m4a")) ext = ".m4a";

  const safeBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .toLowerCase();

  // ✅ Đảm bảo có dấu chấm trước ext
  if (!ext.startsWith(".")) ext = `.${ext}`;

  return `${Date.now()}-${safeBase}${ext}`;
};



/* =========================================================
 * 📦 Multer Storage Config
 * ========================================================= */

// Avatars -> /uploads/avatars/*
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(ROOT_UPLOAD, "avatars");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
});

// Audio -> /uploads/audio/*
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(ROOT_UPLOAD, "audio");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
});

/* =========================================================
 * 🧩 Multer Middleware Export
 * ========================================================= */
export const avatarUpload = multer({ storage: avatarStorage });
export const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/* =========================================================
 * 📸 Upload Avatar (POST /api/upload/avatar)
 * ========================================================= */
export const uploadUserAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filename = req.file.filename;
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ message: "User not found" });
    }

    // Xoá avatar cũ nếu là file local
    if (user.avatarUrl && user.avatarUrl.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(process.cwd(), user.avatarUrl.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    // Lưu avatar mới
    user.avatarUrl = avatarUrl;
    await user.save();

    res.json({
      message: "Avatar uploaded successfully",
      avatarUrl,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ message: "Server error", error: err });
  }
};

/* =========================================================
 * 🎧 Upload Audio cho Practice (POST /api/upload/audio)
 * ========================================================= */
export const uploadPracticeAudio = (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Đường dẫn public
    const url = `/uploads/audio/${req.file.filename}`;

    // Trả về JSON
    res.json({
      url, // Không encode URI, vì safeFilename đã loại ký tự lạ
      size: req.file.size,
      mimetype: req.file.mimetype,
      filename: req.file.filename,
    });
  } catch (err) {
    if ((req as any).file?.path) {
      try { fs.unlinkSync((req as any).file.path); } catch {}
    }
    res.status(500).json({ message: "Upload failed", error: err });
  }
};



/* =========================================================
 * 🎙️ Upload Audio cho Speaking (POST /api/upload/speaking)
 *  - Multer middleware ở route sẽ lưu file vào /uploads/speaking
 *  - Handler chỉ việc trả về URL public để FE phát lại
 * ========================================================= */

export const uploadPracticeSpeaking = (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Đường dẫn public cho SPEAKING
    const url = `/uploads/speaking/${req.file.filename}`;

    return res.json({
      url,
      size: req.file.size,
      mimetype: req.file.mimetype,
      filename: req.file.filename,
    });
  } catch (err) {
    if ((req as any).file?.path) {
      try { fs.unlinkSync((req as any).file.path); } catch {}
    }
    return res.status(500).json({ message: "Upload speaking failed", error: err });
  }
};