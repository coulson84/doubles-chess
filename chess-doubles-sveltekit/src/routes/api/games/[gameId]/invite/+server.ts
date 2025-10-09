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
		// Check if game exists and user is part of it
		const game = await db('games')
			.where({ id: gameId })
			.first();

		if (!game) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		// Check if invitation already exists
		const existingInvite = await db('game_invitations')
			.where({ gameId, invitedUserId: userId })
			.first();

		if (existingInvite) {
			return json({ error: 'User already invited' }, { status: 400 });
		}

		// Create invitation
		const [invitation] = await db('game_invitations')
			.insert({
				gameId,
				invitedBy: session.user.id,
				invitedUserId: userId,
				status: 'pending'
			})
			.returning('*');

		// Send push notification
		await notifyGameInvite(gameId, userId, session.user.name || 'Someone');

		return json({ invitation });
	} catch (error) {
		console.error('Error creating game invitation:', error);
		return json({ error: 'Failed to create invitation' }, { status: 500 });
	}
};
