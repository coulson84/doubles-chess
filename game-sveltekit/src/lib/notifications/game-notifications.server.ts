import db from '$lib/../db.server';
import { sendPushNotificationToMultiple } from './push.server';
import type { ChessNotification } from './types';

export async function notifyFriendRequest(
	userId: string,
	requesterName: string
): Promise<void> {
	try {
		const subscriptions = await db('push_subscriptions')
			.where({ user_id: userId })
			.select('*');

		if (subscriptions.length === 0) {
			return;
		}

		const notification: ChessNotification = {
			type: 'friend_request',
			title: 'New Friend Request',
			body: `${requesterName} wants to be your friend`,
			icon: '/favicon.svg',
			data: {
				url: '/friends',
				type: 'friend_request'
			},
			tag: 'friend-request'
		};

		const result = await sendPushNotificationToMultiple(subscriptions, notification);

		if (result.expiredSubscriptionIds.length > 0) {
			await db('push_subscriptions')
				.whereIn('id', result.expiredSubscriptionIds)
				.delete();
		}

		console.log(`Sent ${result.successful} friend request notifications`);
	} catch (error) {
		console.error('Error sending friend request notification:', error);
	}
}
