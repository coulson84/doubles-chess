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
		const body = await request.json();
		const { userId, team } = body;

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		if (!team || !['white', 'black'].includes(team)) {
			return json({ error: 'Team must be either "white" or "black"' }, { status: 400 });
		}

		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Only game creator can assign teams
		if (game.createdBy !== session.user.id) {
			return json({ error: 'Only the game creator can assign teams' }, { status: 403 });
		}

		// Cannot assign teams if game has started or is complete
		if (game.status === 'inProgress' || game.status === 'complete') {
			return json({ error: 'Cannot assign teams after the game has started' }, { status: 400 });
		}

		// Can only assign teams manually
		if (game.teamAssignment !== 'manual') {
			return json({ error: 'Team assignment is set to random for this game' }, { status: 400 });
		}

		await knex.transaction(async (trx) => {
			// Find the player's invitation
			const player = await trx('game_players')
				.where({ gameId, userId })
				.first();

			if (!player) {
				throw new Error('Player is not part of this game');
			}

			// Check if team already has 2 players
			const teamCount = await trx('game_players')
				.where({ gameId, team })
				.count('* as count')
				.first();

			const currentTeamSize = Number(teamCount?.count || 0);

			// If trying to assign to a team that already has 2 players (and this player is not already on that team)
			if (currentTeamSize >= 2 && player.team !== team) {
				throw new Error(`The ${team} team is already full (2 players)`);
			}

			// Update the player's team
			await trx('game_players')
				.where({ id: player.id })
				.update({ team });
		});

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error assigning team:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to assign team';

		if (
			errorMessage.includes('not accepted') ||
			errorMessage.includes('already full') ||
			errorMessage.includes('not part of')
		) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to assign team' }, { status: 500 });
	}
};
