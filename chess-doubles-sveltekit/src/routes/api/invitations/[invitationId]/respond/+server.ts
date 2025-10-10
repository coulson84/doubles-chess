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

		// Update invitation status and check if game is ready
		await db.transaction(async (trx) => {
			await trx('game_invitations')
				.where({ id: invitationId })
				.update({
					status,
					respondedAt: db.fn.now()
				});

			// If accepted, check if all 3 invited players have accepted
			if (status === 'accepted') {
				const acceptedInvites = await trx('game_invitations')
					.where({ gameId: invitation.gameId, status: 'accepted' })
					.count('* as count')
					.first();

				const acceptedCount = Number(acceptedInvites?.count || 0);

				// If we have 3 accepted invitations (creator + 3 players = 4 total)
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
		return json({ error: 'Failed to respond to invitation' }, { status: 500 });
	}
};
