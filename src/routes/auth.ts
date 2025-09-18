import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/me', authController.getCurrentUser.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

// OAuth routes (if using Google OAuth)
router.get('/google', authController.googleAuth.bind(authController));
router.get('/google/callback', authController.googleCallback.bind(authController));

export default router;