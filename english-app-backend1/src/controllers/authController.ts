import { Request, Response } from "express";
import User from "../models/User";
import UserProgress from "../models/UserProgress";
import Lesson from "../models/Lesson";
import { hashPassword, verifyPassword } from "../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  JwtPayload,
  verifyToken,
} from "../utils/jwt";
import { logActivityHelper } from "../utils/activity-logger";
import { toObjectIdString } from "../utils/objectId";

/**
 * Đăng ký tài khoản mới
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, nickname } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ error: { message: "email & password required" } });

    const exists = await User.findOne({ email }).lean();
    if (exists)
      return res
        .status(409)
        .json({ error: { message: "Email already registered" } });

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      role: "STUDENT",
      nickname,
    });

    const payload: JwtPayload = {
      sub: toObjectIdString(user._id),
      role: user.role || "STUDENT",
      email: user.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Initialize UserProgress for new student
    if (user.role === 'STUDENT') {
      try {
        const userProgress = await UserProgress.create({
          userId: toObjectIdString(user._id),
          currentLevel: 1,
          currentLesson: null,
          completedLessons: [],
          completedTopics: [],
          totalScore: 0,
          streak: 0,
          badges: [],
          totalStudyTime: 0
        });

        // Unlock first lesson
        const firstLesson = await Lesson.findOne({ level: 1, order: 1 });
        if (firstLesson) {
          firstLesson.isUnlocked = true;
          await firstLesson.save();
          userProgress.currentLesson = firstLesson._id.toString();
          await userProgress.save();
        }
      } catch (progressErr) {
        console.error('Failed to initialize user progress:', progressErr);
        // Don't fail registration if progress init fails
      }
    }

    // Log activity
    await logActivityHelper(
      toObjectIdString(user._id),
      'user_registered',
      undefined,
      { email: user.email, role: user.role, nickname: user.nickname }
    );

    return res.status(201).json({
      user: {
        id: toObjectIdString(user._id),
        email: user.email,
        role: user.role,
        nickname: user.nickname,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("register error", err);
    return res.status(500).json({ error: { message: "Failed to register" } });
  }
}

/**
 * Đăng nhập
 */
export async function login(req: Request, res: Response) {
  try {
    console.log("AUTH LOGIN - body:", req.body); // debug
    const { email, password } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ error: { message: "email & password required" } });

    const user: any = await User.findOne({ email }).lean();
    console.log(
      "AUTH LOGIN - found user:",
      !!user,
      user
        ? { id: user._id?.toString(), passwordHash: !!user.passwordHash }
        : null
    ); // debug

    if (!user)
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password" } });

    const ok = await verifyPassword(password, user.passwordHash);
    console.log("AUTH LOGIN - password ok:", ok); // debug

    if (!ok)
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password" } });

    const payload: JwtPayload = {
      sub: toObjectIdString(user._id),
      role: user.role || "STUDENT",
      email: user.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Update last login time
    await User.updateOne({ email }, { lastLogin: new Date() });

    return res.json({
      user: {
        id: toObjectIdString(user._id),
        email: user.email,
        role: user.role,
        nickname: user.nickname,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: { message: "Failed to login" } });
  }
}

/**
 * Làm mới access token bằng refresh token
 */
export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res
        .status(400)
        .json({ error: { message: "refreshToken required" } });

    try {
      const payload = verifyToken(refreshToken);

      const accessToken = signAccessToken({
        sub: payload.sub,
        role: payload.role,
        email: payload.email,
      });

      return res.json({ accessToken });
    } catch (e) {
      return res
        .status(401)
        .json({ error: { message: "Invalid refresh token" } });
    }
  } catch (err) {
    console.error("refresh error", err);
    return res
      .status(500)
      .json({ error: { message: "Failed to refresh token" } });
  }
}
