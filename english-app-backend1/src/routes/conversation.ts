import express from "express";
import {
  uploadAudio,
  conversationHandler,
  getConversationHistory,
  deleteConversationHistory,
} from "../controllers/conversationController";

const router = express.Router();

// 🎙️ Gửi voice → GPT → TTS
router.post("/speak", uploadAudio, conversationHandler);

// 🧾 Lấy lịch sử hội thoại
router.get("/:userId", getConversationHistory);

// 🗑️ Xóa hội thoại
router.delete("/:userId", deleteConversationHistory);

export default router;