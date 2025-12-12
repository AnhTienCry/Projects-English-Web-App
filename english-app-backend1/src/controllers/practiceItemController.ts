import { Request, Response } from "express";
import PracticeItem from "../models/PracticeItem";
import PracticeSection from "../models/PracticeSection";

// POST /v2/practice/sections/:sectionId/items
export async function addPracticeItem(req: Request, res: Response) {
  const { sectionId } = req.params;
  const section = await PracticeSection.findById(sectionId);
  if (!section) return res.status(404).json({ message: "Section not found" });

  const data = {
    sectionId,
    setId: section.setId,
    order: req.body.order,
    type: req.body.type,
    prompt: req.body.prompt,
    options: req.body.options || [],
    answers: req.body.answers || [],
    snippet: req.body.snippet || "",
    sourceRef: req.body.sourceRef || null,
    polarity: req.body.polarity || null,
    answerBool: req.body.answerBool || null,
    pairs: req.body.pairs || [],
    strict: req.body.strict ?? false,
    shuffle: req.body.shuffle ?? true,
    explanation: req.body.explanation || "",
    meta: req.body.meta || undefined,
  };

  const doc = await PracticeItem.create(data);
  await PracticeSection.findByIdAndUpdate(sectionId, { $addToSet: { items: doc._id } });
  res.status(201).json({ id: doc._id });
}

// GET /v2/practice/sections/:sectionId/items
export async function listPracticeItems(req: Request, res: Response) {
  const { sectionId } = req.params;
  const docs = await PracticeItem.find({ sectionId }).sort({ order: 1 }).lean();
  res.json(docs);
}

// PUT /v2/practice/items/:itemId
export async function updatePracticeItem(req: Request, res: Response) {
  const { itemId } = req.params;
  const doc = await PracticeItem.findByIdAndUpdate(itemId, req.body, { new: true });
  if (!doc) return res.status(404).json({ message: "Item not found" });
  res.json(doc);
}

// DELETE /v2/practice/items/:itemId
export async function deletePracticeItem(req: Request, res: Response) {
  const { itemId } = req.params;
  const doc = await PracticeItem.findByIdAndDelete(itemId);
  if (!doc) return res.status(404).json({ message: "Item not found" });
  await PracticeSection.updateMany({}, { $pull: { items: doc._id } });
  res.json({ ok: true });
}
