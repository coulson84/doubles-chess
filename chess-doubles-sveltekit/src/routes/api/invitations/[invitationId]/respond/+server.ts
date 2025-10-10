import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/../db.server';
import { sendToUser } from '$lib/websocket/server';
import type { GameInviteResponsePayload } from '$lib/websocket/types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { invitationId } = params;
	const { status } = await request.json();

	if (!['accepted', 'declined'].includes(status)) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	try {
		// Get the invitation
		const invitation = await db('game_invitations')
			.where({ id: invitationId })
			.first();

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		// Verify the user is the invited user
		if (invitation.invitedUserId !== session.user.id) {
			return json({ error: 'Not authorized to respond to this invitation' }, { status: 403 });
		}

		// Get game info for team assignment
		const game = await db('games')
			.where({ id: invitation.gameId })
			.first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Update invitation status and check if game is ready
		await db.transaction(async (trx) => {
			// If accepting, check if game is already full
			if (status === 'accepted') {
				// Lock and count existing accepted invitations
				const acceptedInvites = await trx('game_invitations')
					.where({ gameId: invitation.gameId, status: 'accepted' })
					.select('id')
					.forUpdate();

				const acceptedCount = acceptedInvites.length;

				// If already 3 players accepted, game is full
				if (acceptedCount >= 3) {
					throw new Error('Game is full. All player slots have been filled.');
				}

				// Automatically assign team (always random on accept)
				// Get current team counts
				const teamCounts = await trx('game_invitations')
					.where({ gameId: invitation.gameId, status: 'accepted' })
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
					// Equal teams, assign randomly
					assignedTeam = Math.random() < 0.5 ? 'white' : 'black';
				}

				// Update invitation status with team assignment
				await trx('game_invitations')
					.where({ id: invitationId })
					.update({
						status,
						respondedAt: db.fn.now(),
						team: assignedTeam
					});
			} else {
				// Just update status for declined
				await trx('game_invitations')
					.where({ id: invitationId })
					.update({
						status,
						respondedAt: db.fn.now()
					});
			}

			// If accepted, check if this was the 3rd player to accept
			if (status === 'accepted') {
				const acceptedInvites = await trx('game_invitations')
					.where({ gameId: invitation.gameId, status: 'accepted' })
					.count('* as count')
					.first();

				const acceptedCount = Number(acceptedInvites?.count || 0);

				// If we now have 3 accepted invitations (creator + 3 players = 4 total)
				if (acceptedCount === 3) {
					await trx('games')
						.where({ id: invitation.gameId })
						.update({ status: 'readyToStart' });
				}
			}
		});

		// Send WebSocket notification to game creator
		const wsPayload: GameInviteResponsePayload = {
			gameId: invitation.gameId,
			invitationId,
			userId: session.user.id,
			userName: session.user.name || 'Someone',
			status: status as 'accepted' | 'declined'
		};

		const eventType = status === 'accepted' ? 'game_invite_accepted' : 'game_invite_declined';
		sendToUser(invitation.invitedBy, { type: eventType, payload: wsPayload });

		return json({ success: true, status });
	} catch (error) {
		console.error('Error responding to invitation:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to respond to invitation';

		if (errorMessage.includes('Game is full')) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to respond to invitation' }, { status: 500 });
	}
};
