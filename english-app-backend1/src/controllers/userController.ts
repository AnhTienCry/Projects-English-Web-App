import { Response } from "express";
import User from "../models/User";
import { hashPassword } from "../utils/hash";
import { AuthRequest } from "../middleware/auth";

/**
 * 👑 Admin tạo tài khoản mới (Teacher / Student / Admin)
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role, nickname } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ message: "email, password, role required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, role, nickname });

    res.status(201).json({
      message: "User created successfully",
      user: { id: user._id, email: user.email, role: user.role, nickname: user.nickname },
    });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👑 Admin xem danh sách user
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    
    // Count users by role
    const total = users.length;
    const teachers = users.filter(u => u.role === 'TEACHER').length;
    const students = users.filter(u => u.role === 'STUDENT').length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    
    res.json({
      users,
      total,
      teachers,
      students,
      admins
    });
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👑 Admin cập nhật thông tin user
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, nickname } = req.body;

    const user = await User.findByIdAndUpdate(id, { role, nickname }, { new: true }).select(
      "-passwordHash"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated", user });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👑 Admin xóa user
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

/**
 * 👤 User tự cập nhật profile của mình
 */
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { nickname, email, avatarUrl } = req.body;

    console.log('📝 Update profile request:', {
      userId,
      nickname,
      email: email ? '***' : undefined,
      hasAvatar: !!avatarUrl,
      avatarLength: avatarUrl ? avatarUrl.length : 0
    });

    // Validate email uniqueness if changing
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const updateData: any = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (email) updateData.email = email;
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
      console.log('✅ Avatar will be updated, length:', avatarUrl.length);
    }

    console.log('📦 Updating fields:', Object.keys(updateData));

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
      "-passwordHash"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log('✅ Profile updated successfully, hasAvatar:', !!user.avatarUrl);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
