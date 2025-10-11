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
	isYourTurn?: boolean;
};

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();

	let games: Game[] = [];
	let availableGames: Game[] = [];

	if (session?.user?.id) {
		const userId = session.user.id;
		try {
			// Get games created by the user
			const createdGames = await knex('games')
				.where({ createdBy: userId })
				.select('*')
				.then(rows => rows.map(game => ({ ...game, role: 'creator' as const })));

			// Get games the user has been invited to
			const invitedGames = await knex('games')
				.join('game_invitations', 'games.id', 'game_invitations.gameId')
				.where({ 'game_invitations.invitedUserId': userId })
				.select(
					'games.*',
					'game_invitations.status as invitationStatus'
				)
				.then(rows => rows.map(game => ({
					...game,
					role: 'invited' as const,
					invitationStatus: game.invitationStatus as 'pending' | 'accepted' | 'declined'
				})));

			// Combine games
			const allGames = [...createdGames, ...invitedGames];

			// For each game, check if it's the user's turn
			const gamesWithTurnInfo = await Promise.all(
				allGames.map(async (game) => {
					// Check if any board in this game has the current user's turn
					const boardsWithUserTurn = await knex('game_boards')
						.where({ gameId: game.id, currentTurnUserId: userId })
						.count('* as count')
						.first();

					return {
						...game,
						isYourTurn: (boardsWithUserTurn?.count as number || 0) > 0
					};
				})
			);

			// Sort: games where it's your turn first (by updatedAt), then all others (by updatedAt)
			games = gamesWithTurnInfo.sort((a, b) => {
				// If one is your turn and the other isn't, prioritize your turn
				if (a.isYourTurn && !b.isYourTurn) return -1;
				if (!a.isYourTurn && b.isYourTurn) return 1;

				// Otherwise, sort by most recently updated
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			});

			// Get public games that haven't started yet (excluding user's own games and games they're invited to)
			const userGameIds = games.map(g => g.id);

			const availableGamesQuery = knex('games')
				.where({ isPrivate: false })
				.whereIn('status', ['awaitingPlayers', 'readyToStart'])
				.whereNot({ createdBy: userId });

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
