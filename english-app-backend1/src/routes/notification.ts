import express from "express";
import { sendNotification, getNotifications, markAsRead, markAllAsRead, getUnreadCount, deleteReadNotifications } from "../controllers/notificationController";
import { authMiddleware } from "../middleware/auth";
import { allowTeacherOrAdmin } from "../middleware/role";

const router = express.Router();

// 👤 All authenticated users can view their notifications
router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.patch("/:id/read", authMiddleware, markAsRead);
router.patch("/mark-all-read", authMiddleware, markAllAsRead);
router.delete("/delete-read", authMiddleware, deleteReadNotifications);

// 👨‍🏫 hoặc 👑 Gửi thông báo
router.post("/send", authMiddleware, allowTeacherOrAdmin, sendNotification);


export default router;