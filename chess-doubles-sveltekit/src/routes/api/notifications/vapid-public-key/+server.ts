import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVapidPublicKey } from '$lib/notifications/push.server';

export const GET: RequestHandler = async () => {
	const publicKey = getVapidPublicKey();

	if (!publicKey) {
		return json({ error: 'Push notifications not configured' }, { status: 503 });
	}

	return json({ publicKey });
};
