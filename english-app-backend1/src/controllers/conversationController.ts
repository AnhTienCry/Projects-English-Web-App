import { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import { AuthRequest } from "../middleware/auth";
import { ConversationHistory } from "../models/ConversationHistory";

const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer({ dest: uploadDir });
export const uploadAudio = storage.single("audio");

/**
 * 🎙️ 1. API: Gửi voice, nhận phản hồi (Whisper → GPT → TTS)
 */
export const conversationHandler = async (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: "No audio uploaded" });

  try {
    console.log("🎤 Received audio:", file.originalname);

    //  Whisper: speech → text
    const whisperForm = new (require("form-data"))();
    whisperForm.append("file", fs.createReadStream(file.path));
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "en"); // 

    const whisperResp = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      whisperForm,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...whisperForm.getHeaders(),
        },
      }
    );

    const transcript = whisperResp.data.text?.trim() || "";
    console.log("🗣️ Transcript:", transcript);

    // 2️⃣ Lấy lịch sử hội thoại gần nhất để tạo ngữ cảnh cho GPT
    const userId = (req as AuthRequest).user?.sub;
    let contextMessages: any[] = [];

    if (userId) {
      const prev = await ConversationHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(8);
      contextMessages = prev
        .reverse()
        .flatMap((h) => [
          { role: "user", content: h.transcript },
          { role: "assistant", content: h.aiResponse },
        ]);
    }

    // 3️⃣ GPT: sinh phản hồi có ngữ cảnh
    const gptResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly English-speaking tutor. Respond with short, natural, human-like answers that match the student's tone and previous context.",
          },
          ...contextMessages,
          { role: "user", content: transcript },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiResponse = gptResp.data.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiResponse);

    // 4️⃣ TTS: chuyển text → giọng nói
    const ttsResp = await axios.post(
      "https://api.openai.com/v1/audio/speech",
      {
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: aiResponse,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        responseType: "arraybuffer",
      }
    );

    const outPath = path.join(uploadDir, `${Date.now()}-reply.mp3`);
    fs.writeFileSync(outPath, Buffer.from(ttsResp.data));
    const audioUrl = `${req.protocol}://${req.get("host")}/uploads/${path.basename(outPath)}`;

    // 5️⃣ Lưu hội thoại
    if (userId) {
      await ConversationHistory.create({
        userId,
        transcript,
        aiResponse,
        audioUrl,
      });
    }

    // Xóa file input tạm
    fs.unlink(file.path, () => {});

    return res.json({
      transcript,
      ai_response: aiResponse,
      audio_url: audioUrl,
    });
  } catch (err: any) {
    console.error("🔥 Conversation Error:", err.response?.data || err.message);

    // fallback demo
    return res.json({
      transcript: "Demo: How are you?",
      ai_response:
        "I'm doing great! Let's keep practicing English together! 🌟",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    });
  }
};

/**
 * 🧾 2. API: Lấy lịch sử hội thoại của người dùng
 * GET /api/conversation/:userId
 */
export const getConversationHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ error: "Missing userId parameter" });

    const history = await ConversationHistory.find({ userId }).sort({
      createdAt: 1,
    });

    return res.json(history);
  } catch (err: any) {
    console.error("❌ Get conversation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * 🗑️ 3. API: Xoá toàn bộ hội thoại của user (tuỳ chọn)
 * DELETE /api/conversation/:userId
 */
export const deleteConversationHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    await ConversationHistory.deleteMany({ userId });
    return res.json({ message: "Conversation history deleted" });
  } catch (err: any) {
    console.error("❌ Delete conversation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};