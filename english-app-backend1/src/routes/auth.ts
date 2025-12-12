import { Router } from 'express';
import { login, register, refresh } from '../controllers/authController';
const router = Router();

/**
 * Đăng nhập
 * body: { email, password }
 */
router.post('/login', login);

/**
 * Đăng ký STUDENT
 * body: { email, password, nickname? }
 */
router.post('/register', register);

/**
 * Refresh token
 * body: { refreshToken }
 */
router.post('/refresh', refresh);

export default router;
