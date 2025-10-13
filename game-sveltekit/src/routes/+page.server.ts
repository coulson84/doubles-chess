import type { PageServerLoad } from './$types';
import knex from '../db.server';

type Game = {
	id: string;
	createdBy: string;
	status: 'awaitingPlayers' | 'readyToStart' | 'inProgress' | 'complete';
	createdAt: Date;
	updatedAt: Date;
	role?: 'creator' | 'invited';
	invitationStatus?: 'pending' | 'accepted' | 'declined';
};

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	let games: Game[] = [];

	if (session?.user?.id) {
		try {
			// Get games created by the user
			const createdGames = await knex('games')
				.where({ createdBy: session.user.id })
				.select('*')
				.then(rows => rows.map(game => ({ ...game, role: 'creator' as const })));

			// Get games the user has been invited to
			const invitedGames = await knex('games')
				.join('game_invitations', 'games.id', 'game_invitations.gameId')
				.where({ 'game_invitations.invitedUserId': session.user.id })
				.select(
					'games.*',
					'game_invitations.status as invitationStatus'
				)
				.then(rows => rows.map(game => ({
					...game,
					role: 'invited' as const,
					invitationStatus: game.invitationStatus as 'pending' | 'accepted' | 'declined'
				})));

			// Combine and sort by creation date
			games = [...createdGames, ...invitedGames].sort((a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} catch (error) {
			console.error('Error fetching games:', error);
		}
	}

	return {
		session,
		games
	};
};
