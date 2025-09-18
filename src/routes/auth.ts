import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post('/refresh', authController.refreshToken);

// OAuth routes (if using Google OAuth)
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

export default router;