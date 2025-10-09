import type { PageServerLoad } from './$types';
import knex from '../db.server';

type Game = {
	id: string;
	createdBy: string;
	status: 'awaitingPlayers' | 'readyToStart' | 'inProgress' | 'complete';
	createdAt: Date;
	updatedAt: Date;
};

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	let games: Game[] = [];

	if (session?.user?.id) {
		try {
			games = await knex('games')
				.where({ createdBy: session.user.id })
				.orderBy('createdAt', 'desc')
				.select('*');
		} catch (error) {
			console.error('Error fetching games:', error);
		}
	}

	return {
		session,
		games
	};
};
