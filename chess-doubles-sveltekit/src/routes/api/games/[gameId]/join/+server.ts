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
			const inTheGame = await trx('game_players')
				.where({ gameId, userId: session.user.id })
				.first();

			if (inTheGame) {
				throw new Error('You have already joined this game');
			}

			const existingInvite = await trx('game_invitations')
				.where({ gameId, invitedUserId: session.user.id })
				.first();

			if (existingInvite) {
				if (existingInvite.status === 'pending' || existingInvite.status === 'declined') {
					// Determine team assignment for rejoin (always random)
					// Get current team counts
					const teamCounts = await trx('game_players')
						.where({ gameId })
						.select('team')
						.then(rows => {
							const counts = { white: 0, black: 0 };
							rows.forEach(row => {
								if (row.team === 'white') counts.white++;
								if (row.team === 'black') counts.black++;
							});
							return counts;
						});

					// Assign to team with fewer players, or random if equal
					let assignedTeam: 'white' | 'black';
					if (teamCounts.white < teamCounts.black) {
						assignedTeam = 'white';
					} else if (teamCounts.black < teamCounts.white) {
						assignedTeam = 'black';
					} else {
						assignedTeam = Math.random() < 0.5 ? 'white' : 'black';
					}

					// Update existing invitation to accepted
					await trx('game_invitations')
						.where({ gameId, invitedUserId: session.user.id })
						.update({
							status: 'accepted',
							respondedAt: trx.fn.now(),
						});

					// Add player to game_players table
					await trx('game_players').insert({
						gameId,
						userId: session.user.id,
						team: assignedTeam,
						isCreator: false
					});

					return;
				}
			}

			// Check if game is already full (3 accepted invitations)
			const players = await trx('game_players')
				.where({ gameId })
				.select('id', 'team')
				.forUpdate();

			if (players.length >= 4) {
				throw new Error('Game is full. All player slots have been filled.');
			}

			// Determine team assignment for new join (always random)
			// Get current team counts
			const teamCounts = { white: 0, black: 0 };
			players.forEach(player => {
				if (player.team === 'white') teamCounts.white++;
				if (player.team === 'black') teamCounts.black++;
			});

			// Assign to team with fewer players, or random if equal
			let assignedTeam: 'white' | 'black';
			if (teamCounts.white < teamCounts.black) {
				assignedTeam = 'white';
			} else if (teamCounts.black < teamCounts.white) {
				assignedTeam = 'black';
			} else {
				assignedTeam = Math.random() < 0.5 ? 'white' : 'black';
			}

			// Create a new accepted invitation
			await trx('game_invitations').update({
				status: 'accepted',
				respondedAt: trx.fn.now(),
			}).where({ gameId, invitedUserId: session.user.id });

			// Add player to game_players table
			await trx('game_players').insert({
				gameId,
				userId: session.user.id,
				team: assignedTeam,
				isCreator: false
			});

			// If this is the 3rd player, update game status to readyToStart
			if (players.length + 1 === 4) {
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
