import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '$lib/db.server';
import { Chess } from 'chess.js';
import { sendToUser } from '../../../../../../../lib/websocket/server';
import { clamp } from 'ramda';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	const { gameId, boardId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { from, to, promotion } = await request.json();

		if (!from || !to) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Get the board
		const board = await knex('game_boards')
			.where({ id: boardId, gameId })
			.first();

		if (!board) {
			return json({ error: 'Board not found' }, { status: 404 });
		}

		// Verify it's the player's turn
		if (board.currentTurnUserId !== session.user.id) {
			return json({ error: 'Not your turn' }, { status: 403 });
		}

		// Verify the player is on this board
		if (board.whitePlayerId !== session.user.id && board.blackPlayerId !== session.user.id) {
			return json({ error: 'You are not playing on this board' }, { status: 403 });
		}

		// Check move differential limit (20% rule)
		// Get the other board in this game
		const allBoards = await knex('game_boards')
			.where({ gameId })
			.select('id', 'moveHistory');

		if (allBoards.length === 2) {
			const currentBoard = allBoards.find(b => b.id === boardId);
			const otherBoard = allBoards.find(b => b.id !== boardId);

			if (currentBoard && otherBoard) {
				const currentMoveCount = Array.isArray(currentBoard.moveHistory)
					? currentBoard.moveHistory.length
					: 0;
				const otherMoveCount = Array.isArray(otherBoard.moveHistory)
					? otherBoard.moveHistory.length
					: 0;

				// Calculate the minimum move count (the board with fewer moves)
				const minMoveCount = Math.min(currentMoveCount, otherMoveCount);

				// Calculate max allowed difference:
				// - Minimum of 4 moves for early game (0-24 moves)
				// - After 24 moves, use 20% rule which will be at least 4
				const maxAllowedDifference = clamp(4, 100, Math.floor(minMoveCount * 0.2));

				// After this move, current board will have one more move
				const projectedMoveCount = currentMoveCount + 1;
				const projectedDifference = projectedMoveCount - otherMoveCount;

				// If this board would be too far ahead, block the move
				if (projectedDifference > maxAllowedDifference) {
					return json({
						error: `This board is ahead by ${currentMoveCount - otherMoveCount} moves. Must wait for the other board to make a move. (Max allowed difference: ${maxAllowedDifference} moves)`,
						waitingForOtherBoard: true
					}, { status: 403 });
				}
			}
		}

		// Validate and execute the move using chess.js
		const chess = new Chess(board.fen);
		const move = chess.move({
			from,
			to,
			promotion: promotion || 'q'
		});

		if (!move) {
			return json({ error: 'Invalid move' }, { status: 400 });
		}

		// Determine next player
		const nextPlayerId = board.currentTurnUserId === board.whitePlayerId
			? board.blackPlayerId
			: board.whitePlayerId;

		// Update the board state
		await knex('game_boards')
			.where({ id: boardId })
			.update({
				fen: chess.fen(),
				moveHistory: knex.raw('"moveHistory" || ?', [JSON.stringify([move])]),
				currentTurnUserId: nextPlayerId,
				lastMoveAt: knex.fn.now(),
				updatedAt: knex.fn.now()
			});

		// Check if game is over on this board
		if (chess.isGameOver()) {
			// TODO: Handle game over logic
			console.log(`Board ${boardId} game over:`, {
				checkmate: chess.isCheckmate(),
				stalemate: chess.isStalemate(),
				draw: chess.isDraw()
			});
		}

		// Send WebSocket notification to opponent
		sendToUser(nextPlayerId, {
			type: 'chess_move',
			payload: {
				gameId,
				boardId,
				move,
				fen: chess.fen()
			}
		});

		return json({ success: true, move, fen: chess.fen() }, { status: 200 });
	} catch (error) {
		console.error('Error making move:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to make move';
		return json({ error: errorMessage }, { status: 500 });
	}
};
