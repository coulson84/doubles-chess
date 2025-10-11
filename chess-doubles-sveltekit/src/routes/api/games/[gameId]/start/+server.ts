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

		// Sort players by position to ensure deterministic board assignment
		whitePlayers.sort((a, b) => (a.playerPosition || 99) - (b.playerPosition || 99));
		blackPlayers.sort((a, b) => (a.playerPosition || 99) - (b.playerPosition || 99));

		// Find white and black player 1 (position 1)
		const whitePlayer1 = whitePlayers.find(p => p.playerPosition === 1);
		const blackPlayer1 = blackPlayers.find(p => p.playerPosition === 1);

		// Find white and black player 2 (position 2)
		const whitePlayer2 = whitePlayers.find(p => p.playerPosition === 2);
		const blackPlayer2 = blackPlayers.find(p => p.playerPosition === 2);

		// Verify all positions are assigned
		if (!whitePlayer1 || !blackPlayer1 || !whitePlayer2 || !blackPlayer2) {
			return json({ error: 'All players must have positions (1 or 2) assigned before starting' }, { status: 400 });
		}

		// Update game status and create boards in a transaction
		await db.transaction(async (trx) => {
			// Update game status to in progress
			await trx('games').where({ id: gameId }).update({
				status: 'inProgress',
				updatedAt: trx.fn.now()
			});

			// Create two boards with deterministic player pairings
			// Board 1: White Player 1 vs Black Player 1
			await trx('game_boards').insert({
				gameId,
				boardNumber: 1,
				whitePlayerId: whitePlayer1.userId,
				blackPlayerId: blackPlayer1.userId,
				currentTurnUserId: whitePlayer1.userId, // White starts
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				moveHistory: []
			});

			// Board 2: White Player 2 vs Black Player 2
			await trx('game_boards').insert({
				gameId,
				boardNumber: 2,
				whitePlayerId: whitePlayer2.userId,
				blackPlayerId: blackPlayer2.userId,
				currentTurnUserId: whitePlayer2.userId, // White starts
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
