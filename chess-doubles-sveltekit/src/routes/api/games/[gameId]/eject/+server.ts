import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../../db.server';
import { sendToUser } from '../../../../../lib/websocket/server';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	const { gameId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { userId } = body;

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Only game creator can eject players
		if (game.createdBy !== session.user.id) {
			return json({ error: 'Only the game creator can eject players' }, { status: 403 });
		}

		// Cannot eject if game has started or is complete
		if (game.status === 'inProgress' || game.status === 'complete') {
			return json({ error: 'Cannot eject players from a game that has already started' }, { status: 400 });
		}

		// Cannot eject yourself
		if (userId === session.user.id) {
			return json({ error: 'You cannot eject yourself from the game' }, { status: 400 });
		}

		await knex.transaction(async (trx) => {
			// Find the player's invitation
			const player = await trx('game_players')
				.where({ gameId, userId })
				.first();

			if (!player) {
				throw new Error('Player is not part of this game');
			}

			// Delete the invitation (eject the player)
			await trx('game_invitations').where({ invitedPlayerId: player.userId, gameId }).delete();

			// Check remaining accepted invitations
			const remainingAccepted = await trx('game_invitations')
				.where({ gameId, status: 'accepted' })
				.count('* as count')
				.first();

			const acceptedCount = Number(remainingAccepted?.count || 0);

			// If game was readyToStart and now has less than 3 players, change back to awaitingPlayers
			if (game.status === 'readyToStart' && acceptedCount < 3) {
				await trx('games').where({ id: gameId }).update({ status: 'awaitingPlayers' });
			}
		});

		// Send WebSocket notification to ejected player
		sendToUser(userId, {
			type: 'player_ejected',
			payload: {
				gameId,
				message: 'You have been removed from the game by the creator'
			}
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error ejecting player:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to eject player';

		if (errorMessage.includes('not part of')) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to eject player' }, { status: 500 });
	}
};
