import { Request, Response } from "express";
import PracticeSection from "../models/PracticeSection";
import PracticeItem from "../models/PracticeItem";
import path from "path";
import slugify from "slugify";

/**
 * GET /v2/practice/sets/:setId/sections
 * Hỗ trợ query ?skill=listening|reading|writing|speaking
 */
export async function listSections(req: Request, res: Response) {
  try {
    const { setId } = req.params;
    const { skill } = req.query as { skill?: string };

    if (!setId) return res.status(400).json({ message: "Missing setId" });

    // lọc theo setId, có thể kèm skill
    const where: Record<string, any> = { setId };
    if (skill) where.skill = skill;

    const sections = await PracticeSection.find(where).sort({ order: 1 }).lean();

    // ✅ Chỉ convert thành absolute URL nếu có PUBLIC_BASE_URL (production)
    // Mobile app sẽ tự xử lý relative path với baseUrl của nó
    const base = process.env.PUBLIC_BASE_URL;
    const mapped = sections.map((s) => {
      let audioUrl = s.audioUrl;
      // Chỉ convert nếu có PUBLIC_BASE_URL (production) và chưa phải absolute URL
      if (audioUrl && base && !/^https?:\/\//i.test(audioUrl)) {
        audioUrl = `${base}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
      }
      // Nếu không có PUBLIC_BASE_URL, giữ nguyên relative path để mobile tự xử lý
      return { ...s, audioUrl };
    });

    res.json(mapped);
  } catch (err) {
    console.error("listSections error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /v2/practice/sections/:sectionId
 * Lấy chi tiết section + items
 */
export async function getSection(req: Request, res: Response) {
  try {
    const { sectionId } = req.params;
    const section = await PracticeSection.findById(sectionId).lean();
    if (!section) return res.status(404).json({ message: "Not found" });

    const items = await PracticeItem.find({ sectionId }).sort({ order: 1 }).lean();

    // ✅ Chỉ convert thành absolute URL nếu có PUBLIC_BASE_URL (production)
    // Mobile app sẽ tự xử lý relative path với baseUrl của nó
    const base = process.env.PUBLIC_BASE_URL;
    let audioUrl = section.audioUrl;
    // Chỉ convert nếu có PUBLIC_BASE_URL (production) và chưa phải absolute URL
    if (audioUrl && base && !/^https?:\/\//i.test(audioUrl)) {
      audioUrl = `${base}${audioUrl.startsWith("/") ? "" : "/"}${audioUrl}`;
    }
    // Nếu không có PUBLIC_BASE_URL, giữ nguyên relative path để mobile tự xử lý

    res.json({ ...section, audioUrl, items });
  } catch (err) {
    console.error("getSection error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /v2/practice/sections/:sectionId
 * Cập nhật audio / transcript / config
 * → tự động slugify tên file audio để tránh lỗi MediaPlayer
 */
export async function updateSection(req: Request, res: Response) {
  try {
    const { sectionId } = req.params;

    const payload: any = {
      title: req.body.title,
      transcript: req.body.transcript,
      transcriptMode: req.body.transcriptMode,
      maxReplay: req.body.maxReplay,
      timestamps: req.body.timestamps,
    };

    // ✅ Xử lý audioUrl an toàn: đổi tên file có dấu thành không dấu
    if (req.body.audioUrl) {
      const raw = req.body.audioUrl as string;

      // Lấy tên file gốc
      const fileName = path.basename(raw);
      // Tách extension để giữ lại dấu chấm (.mp3, .wav, ...)
      const ext = path.extname(fileName); // .mp3, .wav, etc.
      const baseName = path.basename(fileName, ext); // phần tên không có extension
      
      // Chỉ slugify phần base name, giữ nguyên extension
      const safeBase = slugify(baseName, { lower: true, strict: true });
      const safeName = `${safeBase}${ext}`; // ghép lại với extension
      const dir = path.dirname(raw);

      // Giữ nguyên thư mục uploads/audio/... và mã hóa URL
      payload.audioUrl = encodeURI(`${dir}/${safeName}`);
    }

    const doc = await PracticeSection.findByIdAndUpdate(sectionId, payload, { new: true });
    if (!doc) return res.status(404).json({ message: "Section not found" });

    res.json({
      ok: true,
      section: doc,
    });
  } catch (err) {
    console.error("updateSection error:", err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
}
