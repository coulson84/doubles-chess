import { Router } from 'express';
import { GameController } from '../controllers/gameController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();
const gameController = new GameController();

router.post('/create', authenticate, gameController.createGame);
router.post('/join/:code', authenticate, gameController.joinGame);
router.get('/game/:id', optionalAuth, gameController.getGame);
router.post('/game/:id/move', authenticate, gameController.makeMove);
router.post('/game/:id/resign', authenticate, gameController.resign);
router.get('/my-games', authenticate, gameController.getMyGames);
router.get('/active', gameController.getActiveGames);

export default router;