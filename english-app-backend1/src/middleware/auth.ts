import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { Server as SocketIOServer } from "socket.io";


/** mở rộng type cho req.app.get('io') */
declare global {
  namespace Express {
    interface Application {
      get(name: "io"): SocketIOServer;
    }
  }
}

/** mở rộng type cho req.user */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * 🧩 Middleware xác thực người dùng qua JWT
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn("❌ Missing Authorization header");
    return res.status(401).json({ error: { message: "Missing token" } });
  }

  const [scheme, token] = authHeader.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) {
    console.warn("❌ Invalid Authorization format:", authHeader);
    return res.status(401).json({ error: { message: "Invalid token format" } });
  }

  try {
    const payload = verifyToken(token);
    console.log("✅ Token verified successfully:", payload);
    req.user = payload;
    next();
  } catch (err: any) {
    console.error("❌ JWT verify failed:", err.message);
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}

/**
 * 🧩 Optional authentication middleware - allows requests without auth but attaches user if token is valid
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // No auth header - allow request but no user
    return next();
  }

  const [scheme, token] = authHeader.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) {
    // Invalid format - allow request but no user
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    // Token is valid - attach user and continue
    next();
  } catch (err: any) {
    // Token invalid or expired - allow request but no user
    console.log("⚠️ Optional auth: Invalid token, continuing without user");
    next();
  }
}


/**
 * 🧩 Middleware phân quyền theo danh sách role cụ thể
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: { message: "Unauthenticated" } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: `Forbidden: requires ${roles.join(" or ")}` } });
    }
    next();
  };
}

// ✅ alias ngắn gọn
export const isAdmin = requireRole("ADMIN");
export const isTeacher = requireRole("TEACHER");
export const isStudent = requireRole("STUDENT");

// ✅ alias tương thích với code cũ
export { authenticate as authMiddleware };

/* -------------------------------------------------------------------------- */
/* 👇 BỔ SUNG CÁC MIDDLEWARE MỚI CHO PHÂN QUYỀN RÕ RÀNG                      */
/* -------------------------------------------------------------------------- */

/** 👨‍🏫 hoặc 👑 được phép */
export function allowTeacherOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.role;
  console.log("👤 allowTeacherOrAdmin:", req.user);

  if (role === "ADMIN" || role === "TEACHER") {
    console.log("✅ Access granted for role:", role);
    return next();
  }

  console.warn("🚫 Access denied. Role:", role);
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
