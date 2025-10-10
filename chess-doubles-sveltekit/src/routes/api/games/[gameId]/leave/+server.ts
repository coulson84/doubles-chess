import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../../db.server';
import { sendToUser } from '../../../../../lib/websocket/server';

export const POST: RequestHandler = async ({ locals, params }) => {
	const session = await locals.auth();
	const { gameId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Cannot leave if game has started or is complete
		if (game.status === 'inProgress' || game.status === 'complete') {
			return json({ error: 'Cannot leave a game that has already started' }, { status: 400 });
		}

		await knex.transaction(async (trx) => {
			// Find the user's invitation
			const invitation = await trx('game_invitations')
				.where({ gameId, invitedUserId: session.user.id })
				.first();

			if (!invitation) {
				throw new Error('You are not part of this game');
			}

			if (invitation.status !== 'accepted') {
				throw new Error('You have not accepted this game invitation');
			}

			// Delete the invitation (leaving the game)
			await trx('game_invitations').where({ id: invitation.id }).delete();

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

		// Send WebSocket notification to game creator
		sendToUser(game.createdBy, {
			type: 'game_invite_declined',
			payload: {
				gameId,
				userId: session.user.id,
				userName: session.user.name || 'Unknown User'
			}
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error leaving game:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to leave game';

		if (errorMessage.includes('not part of') || errorMessage.includes('not accepted')) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to leave game' }, { status: 500 });
	}
};
