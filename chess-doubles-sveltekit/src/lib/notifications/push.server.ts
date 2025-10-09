import webpush from 'web-push';
import type { ChessNotification, PushSubscription } from './types';

// VAPID keys should be generated once and stored in environment variables
// Generate keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

console.log('VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY ? 'set' : 'not set');
console.log('VAPID_PRIVATE_KEY:', VAPID_PRIVATE_KEY ? 'set' : 'not set');
console.log('VAPID_SUBJECT:', VAPID_SUBJECT);
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
	webpush.setVapidDetails(
		VAPID_SUBJECT,
		VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY
	);
}

export async function sendPushNotification(
	subscription: PushSubscription,
	notification: ChessNotification
): Promise<boolean> {
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		console.warn('VAPID keys not configured. Push notifications disabled.');
		return false;
	}

	try {
		const pushSubscription = {
			endpoint: subscription.endpoint,
			keys: {
				p256dh: subscription.p256dh,
				auth: subscription.auth
			}
		};

		await webpush.sendNotification(
			pushSubscription,
			JSON.stringify(notification)
		);

		return true;
	} catch (error) {
		console.error('Error sending push notification:', error);

		// Handle expired subscriptions
		if (error && typeof error === 'object' && 'statusCode' in error) {
			const statusCode = (error as any).statusCode;
			if (statusCode === 404 || statusCode === 410) {
				// Subscription expired or is invalid - should be removed from database
				return false;
			}
		}

		throw error;
	}
}

export async function sendPushNotificationToMultiple(
	subscriptions: PushSubscription[],
	notification: ChessNotification
): Promise<{ successful: number; failed: number; expiredSubscriptionIds: string[] }> {
	const results = await Promise.allSettled(
		subscriptions.map(sub => sendPushNotification(sub, notification))
	);

	const expiredSubscriptionIds: string[] = [];
	let successful = 0;
	let failed = 0;

	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			if (result.value === false) {
				// Subscription expired
				const subId = subscriptions[index].id;
				if (subId) {
					expiredSubscriptionIds.push(subId);
				}
			} else {
				successful++;
			}
		} else {
			failed++;
		}
	});

	return { successful, failed, expiredSubscriptionIds };
}

export function getVapidPublicKey(): string {
	return VAPID_PUBLIC_KEY;
}
