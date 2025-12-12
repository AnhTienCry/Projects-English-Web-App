import { Request, Response } from "express";
import Badge from "../models/Badge";

export const getBadges = async (req: Request, res: Response) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const earnBadge = async (req: Request, res: Response) => {
  try {
    const { userId, badgeId } = req.body;
    await Badge.findByIdAndUpdate(badgeId, { $addToSet: { users: userId } });
    res.json({ message: "Badge earned!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
