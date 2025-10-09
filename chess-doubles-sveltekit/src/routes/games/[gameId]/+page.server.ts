import type { PageServerLoad } from './$types';
import knex from '../../../db.server';
import { error } from '@sveltejs/kit';

type Game = {
	id: string;
	createdBy: string;
	status: 'awaitingPlayers' | 'readyToStart' | 'inProgress' | 'complete';
	createdAt: Date;
	updatedAt: Date;
};

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const { gameId } = event.params;

	try {
		const game = await knex('games')
			.where({ id: gameId })
			.first();

		if (!game) {
			throw error(404, 'Game not found');
		}

		return {
			session,
			game: game as Game
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching game:', err);
		throw error(500, 'Failed to load game');
	}
};
