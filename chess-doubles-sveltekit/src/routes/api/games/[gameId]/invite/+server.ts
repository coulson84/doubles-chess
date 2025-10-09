import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/../db.server';
import { notifyGameInvite } from '$lib/notifications/game-notifications.server';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { gameId } = params;
	const { userId } = await request.json();

	if (!userId) {
		return json({ error: 'User ID required' }, { status: 400 });
	}

	try {
		// Use a transaction with row locking to prevent race conditions
		const result = await db.transaction(async (trx) => {
			// Check if game exists
			const game = await trx('games')
				.where({ id: gameId })
				.first();

			if (!game) {
				throw new Error('Game not found');
			}

			// Check if invitation already exists
			const existingInvite = await trx('game_invitations')
				.where({ gameId, invitedUserId: userId })
				.first();

			if (existingInvite) {
				throw new Error('User already invited');
			}

			// Lock the game_invitations rows for this game and count pending/accepted invites
			// Use FOR UPDATE to lock rows and prevent concurrent insertions
			const pendingInvitesCount = await trx('game_invitations')
				.where({ gameId })
				.whereIn('status', ['pending', 'accepted'])
				.count('* as count')
				.forUpdate()
				.first();

			const inviteCount = Number(pendingInvitesCount?.count || 0);

			if (inviteCount >= 3) {
				throw new Error('Maximum 3 pending/accepted invitations allowed (1 creator + 3 invited players)');
			}

			// Create invitation
			const [invitation] = await trx('game_invitations')
				.insert({
					gameId,
					invitedBy: session.user.id,
					invitedUserId: userId,
					status: 'pending'
				})
				.returning('*');

			return invitation;
		});

		// Send push notification (outside transaction to avoid blocking)
		await notifyGameInvite(gameId, userId, session.user.name || 'Someone');

		return json({ invitation: result });
	} catch (error) {
		console.error('Error creating game invitation:', error);

		// Handle specific error messages
		const errorMessage = error instanceof Error ? error.message : 'Failed to create invitation';

		if (errorMessage === 'Game not found') {
			return json({ error: errorMessage }, { status: 404 });
		} else if (errorMessage === 'User already invited' || errorMessage.includes('Maximum')) {
			return json({ error: errorMessage }, { status: 400 });
		}

		return json({ error: 'Failed to create invitation' }, { status: 500 });
	}
};
