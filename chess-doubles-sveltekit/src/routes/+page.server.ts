import type { PageServerLoad } from './$types';
import knex from '$lib/db.server';

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
	let availableGames: Game[] = [];

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

			// Get public games that haven't started yet (excluding user's own games and games they're invited to)
			const userGameIds = games.map(g => g.id);

			const availableGamesQuery = knex('games')
				.where({ isPrivate: false })
				.whereIn('status', ['awaitingPlayers', 'readyToStart'])
				.whereNot({ createdBy: session.user.id });

			// Only add whereNotIn if there are game IDs to exclude
			if (userGameIds.length > 0) {
				availableGamesQuery.whereNotIn('id', userGameIds);
			}

			availableGames = await availableGamesQuery
				.select('*')
				.orderBy('createdAt', 'desc')
				.limit(20);
		} catch (error) {
			console.error('Error fetching games:', error);
		}
	}

	return {
		session,
		games,
		availableGames
	};
};
