import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/../db.server';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const subscription = await request.json();

		if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
			return json({ error: 'Invalid subscription data' }, { status: 400 });
		}

		// Insert or update subscription
		await db('push_subscriptions')
			.insert({
				user_id: session.user.id,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			})
			.onConflict(['user_id', 'endpoint'])
			.merge({
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				updated_at: db.fn.now(),
			});

		return json({ success: true });
	} catch (error) {
		console.error('Error saving push subscription:', error);
		return json({ error: 'Failed to save subscription' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { endpoint } = await request.json();

		if (!endpoint) {
			return json({ error: 'Endpoint required' }, { status: 400 });
		}

		await db('push_subscriptions')
			.where({ user_id: session.user.id, endpoint })
			.delete();

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting push subscription:', error);
		return json({ error: 'Failed to delete subscription' }, { status: 500 });
	}
};
