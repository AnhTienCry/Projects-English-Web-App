import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

/* Tạo thư mục nếu chưa có */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/* Gốc uploads */
const ROOT = path.join(__dirname, "../../uploads");
ensureDir(ROOT);

/* Thư mục tách riêng */
const AVATAR_DIR   = path.join(ROOT, "avatars");   // ảnh đại diện
const AUDIO_DIR    = path.join(ROOT, "audio");     // 🔊 Listening audio của section
const SPEAKING_DIR = path.join(ROOT, "speaking");  // 🎙️ File học viên speaking
ensureDir(AVATAR_DIR);
ensureDir(AUDIO_DIR);
ensureDir(SPEAKING_DIR);

/* Tạo tên file duy nhất + giữ ext */
const uniqueName = (prefix: string, originalName: string) => {
  let ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/\s+/g, "_");

  // nếu thiếu dấu chấm ext thì đoán
  const lower = originalName.toLowerCase();
  if (!ext) {
    if (lower.endsWith("mp3")) ext = ".mp3";
    else if (lower.endsWith("wav")) ext = ".wav";
    else if (lower.endsWith("m4a")) ext = ".m4a";
    else if (lower.endsWith("aac")) ext = ".aac";
    else if (lower.endsWith("ogg")) ext = ".ogg";
    else if (lower.endsWith("flac")) ext = ".flac";
    else if (lower.endsWith("webm")) ext = ".webm";
  }
  if (!ext.startsWith(".")) ext = `.${ext}`;

  const rand = Math.round(Math.random() * 1e9);
  return `${prefix}-${Date.now()}-${rand}-${base}${ext}`.toLowerCase();
};

/* ============================= Avatar upload ============================= */
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => cb(null, uniqueName("avatar", file.originalname)),
});
const avatarFileFilter = (_req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  return allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
};
export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
export const uploadAvatar = avatarUpload.single("avatar");

/* ============== Common audio filter (mp3/wav/m4a/...) ==================== */
const audioFileFilter = (_req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith("audio/")) return cb(null, true);
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];
  return allowedExt.includes(ext)
    ? cb(null, true)
    : cb(new Error("Only audio files are allowed (mp3, wav, m4a, aac, ogg, flac, webm)"));
};

/* ============================ Listening audio ============================ */
const listeningStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename:   (_req, file, cb) => cb(null, uniqueName("audio", file.originalname)),
});
export const listeningUpload = multer({
  storage: listeningStorage,
  fileFilter: audioFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});
/** form-data key: 'file' */
export const uploadListeningAudio = listeningUpload.single("file");

/* ============================= Speaking audio ============================ */
const speakingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SPEAKING_DIR),
  filename:   (_req, file, cb) => cb(null, uniqueName("speaking", file.originalname)),
});
export const speakingUpload = multer({
  storage: speakingStorage,
  fileFilter: audioFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});
/** form-data key: 'file' */
export const uploadSpeakingAudio = speakingUpload.single("file");
