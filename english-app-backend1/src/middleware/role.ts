import { AuthRequest } from "./auth";
import { Response, NextFunction } from "express";

/** 👨‍🏫 hoặc 👑 được phép */
export function allowTeacherOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role === "ADMIN" || role === "TEACHER") return next();
  return res.status(403).json({ message: "Forbidden: Admin or Teacher only" });
}

/** 👨‍🎓 chỉ học viên */
export function allowStudentOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === "STUDENT") return next();
  return res.status(403).json({ message: "Forbidden: Student only" });
}

/** 👑 chỉ admin */
export function allowAdminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === "ADMIN") return next();
  return res.status(403).json({ message: "Forbidden: Admin only" });
}
