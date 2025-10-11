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
		const { draggedUserId, targetTeam, targetPosition } = await request.json();

		if (!draggedUserId || !targetTeam || !targetPosition) {
			return json({ error: 'Missing required fields: draggedUserId, targetTeam, targetPosition' }, { status: 400 });
		}

		if (!['white', 'black'].includes(targetTeam)) {
			return json({ error: 'Invalid team. Must be "white" or "black"' }, { status: 400 });
		}

		if (![1, 2].includes(targetPosition)) {
			return json({ error: 'Invalid position. Must be 1 or 2' }, { status: 400 });
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
			// Get the dragged player
			const draggedPlayer = await trx('game_players')
				.where({ gameId, userId: draggedUserId })
				.first();

			if (!draggedPlayer) {
				throw new Error('Dragged player not found in game');
			}

			// Check if there's already a player in the target position
			const targetPlayer = await trx('game_players')
				.where({
					gameId,
					team: targetTeam,
					playerPosition: targetPosition
				})
				.first();

			if (targetPlayer) {
				// Swap: dragged player takes target position, target player takes dragged player's position
				const draggedTeam = draggedPlayer.team;
				const draggedPosition = draggedPlayer.playerPosition;

				// To avoid unique constraint violations, we need to temporarily set one player to null
				// Then update both players
				await trx('game_players')
					.where({ id: draggedPlayer.id })
					.update({
						playerPosition: null
					});

				await trx('game_players')
					.where({ id: targetPlayer.id })
					.update({
						team: draggedTeam,
						playerPosition: draggedPosition
					});

				await trx('game_players')
					.where({ id: draggedPlayer.id })
					.update({
						team: targetTeam,
						playerPosition: targetPosition
					});
			} else {
				// No one in target position, just move dragged player there
				await trx('game_players')
					.where({ id: draggedPlayer.id })
					.update({
						team: targetTeam,
						playerPosition: targetPosition
					});
			}
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error swapping teams:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to swap teams';
		return json({ error: errorMessage }, { status: 500 });
	}
};
