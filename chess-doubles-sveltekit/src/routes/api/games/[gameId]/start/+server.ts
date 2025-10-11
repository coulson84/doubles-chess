import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db.server';
import { sendToUsers } from '$lib/websocket/server';
import type { GameUpdatedPayload } from '$lib/websocket/types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { gameId } = params;

	try {
		// Get the game
		const game = await db('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Verify the user is the creator
		if (game.createdBy !== session.user.id) {
			return json({ error: 'Only the game creator can start the game' }, { status: 403 });
		}

		// Verify game is ready to start
		if (game.status !== 'readyToStart') {
			return json({ error: 'Game is not ready to start' }, { status: 400 });
		}

		// Get all game players
		const gamePlayers = await db('game_players')
			.where({ gameId })
			.select('*');

		if (gamePlayers.length !== 4) {
			return json({ error: 'Need exactly 4 players to start' }, { status: 400 });
		}

		// Separate players by team
		const whitePlayers = gamePlayers.filter(p => p.team === 'white');
		const blackPlayers = gamePlayers.filter(p => p.team === 'black');

		if (whitePlayers.length !== 2 || blackPlayers.length !== 2) {
			return json({ error: 'Each team must have exactly 2 players' }, { status: 400 });
		}

		// Update game status and create boards in a transaction
		await db.transaction(async (trx) => {
			// Update game status to in progress
			await trx('games').where({ id: gameId }).update({
				status: 'inProgress',
				updatedAt: trx.fn.now()
			});

			// Create two boards with player pairings
			// Board 1: White[0] vs Black[0]
			await trx('game_boards').insert({
				gameId,
				boardNumber: 1,
				whitePlayerId: whitePlayers[0].userId,
				blackPlayerId: blackPlayers[0].userId,
				currentTurnUserId: whitePlayers[0].userId, // White starts
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				moveHistory: []
			});

			// Board 2: White[1] vs Black[1]
			await trx('game_boards').insert({
				gameId,
				boardNumber: 2,
				whitePlayerId: whitePlayers[1].userId,
				blackPlayerId: blackPlayers[1].userId,
				currentTurnUserId: whitePlayers[1].userId, // White starts
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				moveHistory: []
			});
		});

		// Get all player IDs for notifications
		const playerIds = gamePlayers.map(p => p.userId);

		// Send WebSocket notification to all players
		const wsPayload: GameUpdatedPayload = {
			gameId,
			status: 'inProgress'
		};

		sendToUsers(playerIds, { type: 'game_started', payload: wsPayload });

		return json({ success: true });
	} catch (error) {
		console.error('Error starting game:', error);
		return json({ error: 'Failed to start game' }, { status: 500 });
	}
};
