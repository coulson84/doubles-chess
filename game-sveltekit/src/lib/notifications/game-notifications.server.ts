import db from '$lib/../db.server';
import { sendPushNotificationToMultiple } from './push.server';
import type { ChessNotification } from './types';

export async function notifyGameInvite(
	gameId: string,
	invitedUserId: string,
	inviterName: string
): Promise<void> {
	try {
		// Get all push subscriptions for the invited user
		const subscriptions = await db('push_subscriptions')
			.where({ user_id: invitedUserId })
			.select('*');

		if (subscriptions.length === 0) {
			console.log(`No push subscriptions found for user ${invitedUserId}`);
			return;
		}

		// Create notification
		const notification: ChessNotification = {
			type: 'game_invite',
			title: 'New Game Invitation!',
			body: `${inviterName} has invited you to a game`,
			icon: '/favicon.svg',
			data: {
				url: `/games/${gameId}`,
				gameId,
				type: 'game_invite'
			},
			tag: `game-invite-${gameId}`,
			requireInteraction: true
		};

		// Send notifications
		const result = await sendPushNotificationToMultiple(subscriptions, notification);

		// Clean up expired subscriptions
		if (result.expiredSubscriptionIds.length > 0) {
			await db('push_subscriptions')
				.whereIn('id', result.expiredSubscriptionIds)
				.delete();
		}

		console.log(`Sent ${result.successful} notifications for game invite to ${invitedUserId}`);
	} catch (error) {
		console.error('Error sending game invite notification:', error);
	}
}

export async function notifyGameMove(
	gameId: string,
	playerIds: string[],
	movedByName: string
): Promise<void> {
	try {
		// Get subscriptions for all players except the one who moved
		const subscriptions = await db('push_subscriptions')
			.whereIn('user_id', playerIds)
			.select('*');

		if (subscriptions.length === 0) {
			return;
		}

		const notification: ChessNotification = {
			type: 'game_move',
			title: 'Your Turn!',
			body: `${movedByName} has made a move`,
			icon: '/favicon.svg',
			data: {
				url: `/games/${gameId}`,
				gameId,
				type: 'game_move'
			},
			tag: `game-move-${gameId}`
		};

		const result = await sendPushNotificationToMultiple(subscriptions, notification);

		// Clean up expired subscriptions
		if (result.expiredSubscriptionIds.length > 0) {
			await db('push_subscriptions')
				.whereIn('id', result.expiredSubscriptionIds)
				.delete();
		}

		console.log(`Sent ${result.successful} move notifications for game ${gameId}`);
	} catch (error) {
		console.error('Error sending game move notification:', error);
	}
}

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
