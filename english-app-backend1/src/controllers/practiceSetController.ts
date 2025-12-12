import { Request, Response } from "express";
import PracticeSet from "../models/PracticeSet";
import PracticeSection from "../models/PracticeSection";

// helper
const SKILLS: Array<{ id: "listening" | "reading" | "writing" | "speaking"; title: string }> = [
  { id: "listening", title: "Listening" },
  { id: "reading",   title: "Reading" },
  { id: "writing",   title: "Writing" },
  { id: "speaking",  title: "Speaking" },
];

// POST /v2/practice/sets
export async function createPracticeSet(req: Request, res: Response) {
  const { examType, title } = req.body;
  if (!examType || !title) return res.status(400).json({ message: "Missing examType or title" });

  const set = await PracticeSet.create({ examType, title });
  // tạo 4 sections mặc định (1/đề/skill)
  await Promise.all(
    SKILLS.map((s, i) =>
      PracticeSection.create({
        setId: set._id,
        skill: s.id,
        order: i + 1,
        title: s.title,
      })
    )
  );
  res.status(201).json({ id: set._id });
}

// GET /v2/practice/sets
// Hỗ trợ lọc qua query: ?examType=ielts|toeic&status=draft|review|published
export async function listPracticeSets(req: Request, res: Response) {
  const { examType, status } = req.query as { examType?: string; status?: string };

  const where: Record<string, any> = {};
  if (examType) where.examType = examType;        // ví dụ 'ielts' hoặc 'toeic'
  if (status) where.status = status;              // ví dụ 'published'

  const docs = await PracticeSet.find(where).sort({ createdAt: -1 }).lean();
  res.json(docs);
}

// GET /v2/practice/sets/:id
export async function getPracticeSet(req: Request, res: Response) {
  const doc = await PracticeSet.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });

  const sections = await PracticeSection.find({ setId: doc._id }).sort({ order: 1 }).lean();
  res.json({ ...doc, sections });
}

// DELETE /v2/practice/sets/:id
export async function deletePracticeSet(req: Request, res: Response) {
  const { id } = req.params;
  const set = await PracticeSet.findByIdAndDelete(id);
  if (!set) return res.status(404).json({ message: "Not found" });

  // dọn dữ liệu con
  const sections = await PracticeSection.find({ setId: id }).select("_id").lean();
  const sectionIds = sections.map((s) => s._id);
  const PracticeItem = (await import("../models/PracticeItem")).default;
  await PracticeItem.deleteMany({ sectionId: { $in: sectionIds } });
  await PracticeSection.deleteMany({ setId: id });

  res.json({ ok: true });
}
