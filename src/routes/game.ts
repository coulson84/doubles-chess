import { Router } from 'express';
import { GameController } from '../controllers/gameController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();
const gameController = new GameController();

router.post('/create', authenticate, gameController.createGame.bind(gameController));
router.post('/join/:code', authenticate, gameController.joinGame.bind(gameController));
router.get('/game/:id', optionalAuth, gameController.getGame.bind(gameController));
router.post('/game/:id/move', authenticate, gameController.makeMove.bind(gameController));
router.post('/game/:id/resign', authenticate, gameController.resign.bind(gameController));
router.get('/my-games', authenticate, gameController.getMyGames.bind(gameController));
router.get('/active', gameController.getActiveGames.bind(gameController));

export default router;