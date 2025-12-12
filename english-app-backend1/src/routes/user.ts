import express from "express";
import { createUser, getUsers, updateUser, deleteUser } from "../controllers/userController";
import { authMiddleware, isAdmin } from "../middleware/auth";

const router = express.Router();

// 👑 Chỉ Admin có quyền CRUD user
router.post("/", authMiddleware, isAdmin, createUser);
router.get("/", authMiddleware, isAdmin, getUsers);
router.get("/teachers", authMiddleware, isAdmin, getUsers);
router.get("/students", authMiddleware, isAdmin, getUsers);
router.get("/:id", authMiddleware, isAdmin, getUsers);
router.put("/:id", authMiddleware, isAdmin, updateUser);
router.delete("/:id", authMiddleware, isAdmin, deleteUser);

export default router;
