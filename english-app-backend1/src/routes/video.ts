import express from "express";
import { 
  getAllVideos, 
  getVideoById, 
  createVideo, 
  updateVideo, 
  deleteVideo,
  getVideosByLesson,
  getVideosByTopic,
  searchVideos,
  addSubtitles,
  addWordDefinition,
  getWordDefinition,
  getYouTubeSubtitles,
  createVideoFromYouTube,
  getYouTubeStreamUrl,
  getYouTubeVideoInfo
} from "../controllers/videoController";
import { authMiddleware, allowTeacherOrAdmin } from "../middleware/auth";

const router = express.Router();

// 👨‍🎓 Student & Teacher đều xem được danh sách video
router.get("/", authMiddleware, getAllVideos);
router.get("/search", authMiddleware, searchVideos);
// Download routes have been removed
router.get("/:id", authMiddleware, getVideoById);
router.get("/lesson/:lessonId", authMiddleware, getVideosByLesson);
router.get("/topic/:topicId", authMiddleware, getVideosByTopic);

// 👨‍🏫 Teacher & Admin CRUD video
router.post("/", authMiddleware, allowTeacherOrAdmin, createVideo);
router.put("/:id", authMiddleware, allowTeacherOrAdmin, updateVideo);
router.delete("/:id", authMiddleware, allowTeacherOrAdmin, deleteVideo);

// 📝 Subtitle and Dictionary Management
router.post("/:id/subtitles", authMiddleware, allowTeacherOrAdmin, addSubtitles);
router.post("/:id/words", authMiddleware, allowTeacherOrAdmin, addWordDefinition);
router.get("/words/:word", authMiddleware, getWordDefinition);

// 🎬 YouTube Integration
router.post("/youtube/subtitles", authMiddleware, allowTeacherOrAdmin, getYouTubeSubtitles);
router.post("/youtube/create", authMiddleware, allowTeacherOrAdmin, createVideoFromYouTube);
router.post("/youtube/stream", authMiddleware, getYouTubeStreamUrl);  // Extract stream URL (legacy - for playback)
router.post("/youtube/info", authMiddleware, allowTeacherOrAdmin, getYouTubeVideoInfo);  // Get video metadata
export default router;



