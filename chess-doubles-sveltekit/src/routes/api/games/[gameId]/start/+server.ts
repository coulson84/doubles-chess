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

		// Update game status to in progress
		await db('games').where({ id: gameId }).update({
			status: 'inProgress',
			updatedAt: db.fn.now()
		});

		// Get all accepted invitations to notify players
		const acceptedInvites = await db('game_invitations')
			.where({ gameId, status: 'accepted' })
			.select('invitedUserId');

		const playerIds = acceptedInvites.map((inv) => inv.invitedUserId);

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
