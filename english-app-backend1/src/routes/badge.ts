import express from "express";
import { getBadges, earnBadge } from "../controllers/badgeController";
import { authMiddleware, isAdmin, isStudent } from "../middleware/auth";

const router = express.Router();

// 👨‍🎓 Student - xem danh sách huy hiệu đạt được
router.get("/", authMiddleware, isStudent, getBadges);

// 👨‍🎓 Student - nhận huy hiệu (server tự cấp)
router.post("/earn", authMiddleware, isStudent, earnBadge);

// 👑 Admin (sau này) - có thể CRUD huy hiệu
// router.post("/", authMiddleware, isAdmin, createBadge);
// router.put("/:id", authMiddleware, isAdmin, updateBadge);
// router.delete("/:id", authMiddleware, isAdmin, deleteBadge);

export default router;
