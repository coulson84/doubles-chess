import { Response, NextFunction } from 'express';
import db from '../db/knex.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export class GameController {
  private generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private getInitialPosition() {
    return {
      board: [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
      ],
      turn: 'white',
      castling: { K: true, Q: true, k: true, q: true },
      enPassant: null,
      halfMoves: 0,
      fullMoves: 1,
    };
  }

  async createGame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const { isPrivate = false } = req.body;

      let code: string;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique game code
      do {
        code = this.generateGameCode();
        const existing = await db('games').where('code', code).first();
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new AppError('Could not generate unique game code', 500);
      }

      const [game] = await db('games')
        .insert({
          code,
          white_player_id: req.user.id,
          current_position: JSON.stringify(this.getInitialPosition()),
          status: 'waiting',
        })
        .returning('*');

      res.status(201).json({ game });
    } catch (error) {
      next(error);
    }
  }

  async joinGame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const { code } = req.params;
      const { side } = req.body;

      const game = await db('games').where('code', code.toUpperCase()).first();

      if (!game) {
        throw new AppError('Game not found', 404);
      }

      if (game.status !== 'waiting') {
        throw new AppError('Game is not available to join', 400);
      }

      // Determine which position to fill
      let updateData: any = {};

      if (!game.black_player_id && side === 'black') {
        updateData.black_player_id = req.user.id;
      } else if (!game.white_partner_id && game.white_player_id !== req.user.id) {
        updateData.white_partner_id = req.user.id;
      } else if (!game.black_partner_id && game.black_player_id !== req.user.id) {
        updateData.black_partner_id = req.user.id;
      } else {
        throw new AppError('No available position in this game', 400);
      }

      // Check if game is full after this join
      const willBeFull =
        (game.white_player_id || updateData.white_player_id) &&
        (game.black_player_id || updateData.black_player_id) &&
        (game.white_partner_id || updateData.white_partner_id) &&
        (game.black_partner_id || updateData.black_partner_id);

      if (willBeFull) {
        updateData.status = 'active';
      }

      const [updatedGame] = await db('games')
        .where('id', game.id)
        .update(updateData)
        .returning('*');

      res.json({ game: updatedGame });
    } catch (error) {
      next(error);
    }
  }

  async listMyGames(req: AuthRequest, res: Response) {
    const games = await db('games')
      .where('white_player_id', req.user?.id)
      .orWhere('black_player_id', req.user?.id)
      .orWhere('white_partner_id', req.user?.id)
      .orWhere('black_partner_id', req.user?.id)
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ games });
  }

  async listUnstartedGames(req: AuthRequest, res: Response) {
    const games = await db('games')
      .where('status', 'waiting')
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ games });
  }


  async getGame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const game = await db('games')
        .where('id', id)
        .orWhere('code', id.toUpperCase())
        .first();

      if (!game) {
        throw new AppError('Game not found', 404);
      }

      // Get player details
      const playerIds = [
        game.white_player_id,
        game.black_player_id,
        game.white_partner_id,
        game.black_partner_id,
      ].filter(Boolean);

      const players = await db('users')
        .whereIn('id', playerIds)
        .select('id', 'username', 'avatar_url', 'rating');

      const playersMap = players.reduce((acc: any, player: any) => {
        acc[player.id] = player;
        return acc;
      }, {});

      // Get moves
      const moves = await db('moves')
        .where('game_id', game.id)
        .orderBy('move_number', 'asc')
        .orderBy('created_at', 'asc');

      res.json({
        game: {
          ...game,
          white_player: playersMap[game.white_player_id],
          black_player: playersMap[game.black_player_id],
          white_partner: playersMap[game.white_partner_id],
          black_partner: playersMap[game.black_partner_id],
        },
        moves,
      });
    } catch (error) {
      next(error);
    }
  }

  async makeMove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const { id } = req.params;
      const { from, to, promotion } = req.body;

      const game = await db('games').where('id', id).first();

      if (!game) {
        throw new AppError('Game not found', 404);
      }

      if (game.status !== 'active') {
        throw new AppError('Game is not active', 400);
      }

      // Check if it's the player's turn
      const isWhiteTeam = req.user.id === game.white_player_id || req.user.id === game.white_partner_id;
      const isBlackTeam = req.user.id === game.black_player_id || req.user.id === game.black_partner_id;

      if (!isWhiteTeam && !isBlackTeam) {
        throw new AppError('You are not a player in this game', 403);
      }

      if ((game.turn === 'white' && !isWhiteTeam) || (game.turn === 'black' && !isBlackTeam)) {
        throw new AppError('It is not your turn', 400);
      }

      // TODO: Validate move using chess.js or similar library
      // For now, we'll just record the move

      const position = JSON.parse(game.current_position);

      // Simple move recording (would need proper chess logic here)
      const move = {
        game_id: game.id,
        player_id: req.user.id,
        move_number: game.move_number,
        from,
        to,
        piece: 'P', // Would need to determine from board
        san: `${from}-${to}`, // Would need proper SAN notation
        position_after: position, // Would need to calculate new position
        promotion,
      };

      await db.transaction(async (trx) => {
        // Insert move
        await trx('moves').insert(move);

        // Update game
        await trx('games')
          .where('id', game.id)
          .update({
            current_position: JSON.stringify(position),
            turn: game.turn === 'white' ? 'black' : 'white',
            move_number: game.turn === 'black' ? game.move_number + 1 : game.move_number,
            last_move_at: new Date(),
          });
      });

      res.json({ success: true, move });
    } catch (error) {
      next(error);
    }
  }

  async resign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const { id } = req.params;

      const game = await db('games').where('id', id).first();

      if (!game) {
        throw new AppError('Game not found', 404);
      }

      const isWhiteTeam = req.user.id === game.white_player_id || req.user.id === game.white_partner_id;
      const isBlackTeam = req.user.id === game.black_player_id || req.user.id === game.black_partner_id;

      if (!isWhiteTeam && !isBlackTeam) {
        throw new AppError('You are not a player in this game', 403);
      }

      const result = isWhiteTeam ? 'black' : 'white';

      const [updatedGame] = await db('games')
        .where('id', game.id)
        .update({
          status: 'completed',
          result,
        })
        .returning('*');

      res.json({ game: updatedGame });
    } catch (error) {
      next(error);
    }
  }

  async getMyGames(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const games = await db('games')
        .where('white_player_id', req.user.id)
        .orWhere('black_player_id', req.user.id)
        .orWhere('white_partner_id', req.user.id)
        .orWhere('black_partner_id', req.user.id)
        .orderBy('created_at', 'desc')
        .limit(20);

      res.json({ games });
    } catch (error) {
      next(error);
    }
  }

  async getActiveGames(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const games = await db('games')
        .where('status', 'active')
        .orderBy('last_move_at', 'desc')
        .limit(20);

      res.json({ games });
    } catch (error) {
      next(error);
    }
  }
}