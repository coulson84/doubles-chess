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
		// Check if game exists and is public
		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		if (game.isPrivate) {
			return json({ error: 'Cannot join private games directly' }, { status: 403 });
		}

		if (game.status !== 'awaitingPlayers' && game.status !== 'readyToStart') {
			return json({ error: 'Game has already started or is complete' }, { status: 400 });
		}

		// Check if user is the creator
		if (game.createdBy === session.user.id) {
			return json({ error: 'You cannot join your own game' }, { status: 400 });
		}

		await knex.transaction(async (trx) => {
			// Check if user already has an invitation
			const existingInvite = await trx('game_invitations')
				.where({ gameId, invitedUserId: session.user.id })
				.first();

			if (existingInvite) {
				if (existingInvite.status === 'accepted') {
					throw new Error('You have already joined this game');
				} else if (existingInvite.status === 'pending') {
					throw new Error('You have already been invited to this game');
				} else if (existingInvite.status === 'declined') {
					// Allow rejoining if previously declined
					await trx('game_invitations')
						.where({ id: existingInvite.id })
						.update({ status: 'accepted', respondedAt: trx.fn.now() });
					return;
				}
			}

			// Check if game is already full (3 accepted invitations)
			const acceptedInvites = await trx('game_invitations')
				.where({ gameId, status: 'accepted' })
				.select('id')
				.forUpdate();

			if (acceptedInvites.length >= 3) {
				throw new Error('Game is full. All player slots have been filled.');
			}

			// Create a new accepted invitation
			await trx('game_invitations').insert({
				gameId,
				invitedBy: game.createdBy,
				invitedUserId: session.user.id,
				status: 'accepted',
				respondedAt: trx.fn.now()
			});

			// If this is the 3rd player, update game status to readyToStart
			if (acceptedInvites.length === 2) {
				await trx('games').where({ id: gameId }).update({ status: 'readyToStart' });
			}
		});

		// Send WebSocket notification to game creator
		sendToUser(game.createdBy, {
			type: 'game_invite_accepted',
			payload: {
				gameId,
				userId: session.user.id,
				userName: session.user.name || 'Unknown User'
			}
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error joining game:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to join game';

		if (errorMessage.includes('Game is full') || errorMessage.includes('already')) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to join game' }, { status: 500 });
	}
};
