import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../../db.server';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	const { gameId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Check if user is the game creator
		const game = await knex('games').where({ id: gameId }).first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		if (game.createdBy !== session.user.id) {
			return json({ error: 'Only the game creator can modify settings' }, { status: 403 });
		}

		// Game must not be in progress or complete
		if (game.status === 'inProgress' || game.status === 'complete') {
			return json(
				{ error: 'Cannot modify settings for games in progress or completed' },
				{ status: 400 }
			);
		}

		const body = await request.json();

		// Extract and validate configuration options
		const updates: any = {};

		if ('isPrivate' in body) {
			updates.isPrivate = Boolean(body.isPrivate);
		}

		if ('timeLimitPerMove' in body) {
			if (body.timeLimitPerMove !== null) {
				if (typeof body.timeLimitPerMove !== 'number' || body.timeLimitPerMove <= 0) {
					return json({ error: 'Time limit per move must be a positive number' }, { status: 400 });
				}
			}
			updates.timeLimitPerMove = body.timeLimitPerMove;
		}

		if ('isRated' in body) {
			updates.isRated = Boolean(body.isRated);
		}

		if ('teamAssignment' in body) {
			if (!['manual', 'random'].includes(body.teamAssignment)) {
				return json({ error: 'Invalid team assignment option' }, { status: 400 });
			}
			updates.teamAssignment = body.teamAssignment;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No valid fields to update' }, { status: 400 });
		}

		// Update game settings
		updates.updatedAt = knex.fn.now();

		const [updatedGame] = await knex('games').where({ id: gameId }).update(updates).returning('*');

		return json({ game: updatedGame }, { status: 200 });
	} catch (error) {
		console.error('Error updating game settings:', error);
		return json({ error: 'Failed to update game settings' }, { status: 500 });
	}
};
