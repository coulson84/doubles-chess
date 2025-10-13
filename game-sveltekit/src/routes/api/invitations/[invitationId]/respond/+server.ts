import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/../db.server';

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

		// Update invitation status
		await db('game_invitations')
			.where({ id: invitationId })
			.update({
				status,
				respondedAt: db.fn.now()
			});

		// If accepted, could add user to game here
		// (depending on your game logic)

		return json({ success: true, status });
	} catch (error) {
		console.error('Error responding to invitation:', error);
		return json({ error: 'Failed to respond to invitation' }, { status: 500 });
	}
};
