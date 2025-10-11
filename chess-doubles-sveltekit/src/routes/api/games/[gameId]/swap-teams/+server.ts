import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '$lib/db.server';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	const { gameId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { draggedUserId, targetUserId } = await request.json();

		if (!draggedUserId || !targetUserId) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Check if game exists and user is the creator
		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		if (game.createdBy !== session.user.id) {
			return json({ error: 'Only the game creator can swap teams' }, { status: 403 });
		}

		if (game.status !== 'awaitingPlayers' && game.status !== 'readyToStart') {
			return json({ error: 'Cannot swap teams after game has started' }, { status: 400 });
		}

		await knex.transaction(async (trx) => {
			// Get both players from game_players
			const draggedPlayer = await trx('game_players')
				.where({ gameId, userId: draggedUserId })
				.first();

			const targetPlayer = await trx('game_players')
				.where({ gameId, userId: targetUserId })
				.first();

			if (!draggedPlayer || !targetPlayer) {
				throw new Error('One or both players not found in game');
			}

			// Swap teams
			const draggedTeam = draggedPlayer.team;
			const targetTeam = targetPlayer.team;

			await trx('game_players')
				.where({ id: draggedPlayer.id })
				.update({ team: targetTeam });

			await trx('game_players')
				.where({ id: targetPlayer.id })
				.update({ team: draggedTeam });

			// Also update the invitations table for non-creator players
			await trx('game_invitations')
				.where({ gameId, invitedUserId: draggedUserId, status: 'accepted' })
				.update({ team: targetTeam });

			await trx('game_invitations')
				.where({ gameId, invitedUserId: targetUserId, status: 'accepted' })
				.update({ team: draggedTeam });
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error swapping teams:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to swap teams';
		return json({ error: errorMessage }, { status: 500 });
	}
};
