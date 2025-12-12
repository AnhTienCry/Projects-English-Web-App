import { Request, Response } from "express";
import Notification from "../models/Notification";
import { AuthRequest } from "../middleware/auth";
//import { io } from "../utils/serverSocket";

/**
 * 🔔 Gửi thông báo đến một user cụ thể (qua DB + Socket.io)
 * Body yêu cầu: { userId, title, body }
 * Chỉ admin hoặc giảng viên nên dùng
 */
export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️⃣ Tạo bản ghi trong MongoDB
    const note = await Notification.create({
      userId,
      type: type || 'general',
      title,
      message,
    });

    // 2️⃣ Lấy đối tượng io từ app (được set trong server.ts)
    const io = req.app.get("io");
    if (io) {
      // 3️⃣ Gửi realtime đến phòng userId (đã join qua socket)
      io.to(userId.toString()).emit("notification.send", {
        id: note._id,
        type: note.type,
        title: note.title,
        message: note.message,
        createdAt: note.createdAt,
      });
    }

    return res.json({ message: "Notification sent", data: note });
  } catch (err) {
    console.error("Error sending notification:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 📩 Lấy danh sách thông báo của người dùng hiện tại
 * Token chứa req.user.id
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await Notification.find({ userId })
      .sort({ sentAt: -1 })
      .lean();

    res.json({ notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 🟢 Đánh dấu một thông báo là đã đọc
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;
    
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 🟢 Đánh dấu tất cả thông báo là đã đọc
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 🔢 Lấy số lượng thông báo chưa đọc
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const count = await Notification.countDocuments({ userId, isRead: false });
    res.json({ count });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 🗑️ Xóa tất cả thông báo đã đọc
 */
export const deleteReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await Notification.deleteMany({ userId, isRead: true });
    
    console.log(`✅ Deleted ${result.deletedCount} read notifications for user ${userId}`);
    res.json({ 
      message: "Read notifications deleted successfully", 
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error("Error deleting read notifications:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
