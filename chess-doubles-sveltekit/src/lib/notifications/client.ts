// Client-side utilities for managing push notifications

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) {
		throw new Error('Notifications not supported in this browser');
	}

	return await Notification.requestPermission();
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export async function subscribeToPushNotifications(
	vapidPublicKey: string
): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) {
		throw new Error('Service workers not supported');
	}

	const registration = await navigator.serviceWorker.ready;

	const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

	try {
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey
		});

		return subscription;
	} catch (error) {
		console.error('Failed to subscribe to push notifications:', error);
		return null;
	}
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
	if (!('serviceWorker' in navigator)) {
		return false;
	}

	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();

	if (subscription) {
		return await subscription.unsubscribe();
	}

	return false;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) {
		return null;
	}

	const registration = await navigator.serviceWorker.ready;
	return await registration.pushManager.getSubscription();
}

export async function saveSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
	try {
		const response = await fetch('/api/notifications/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(subscription)
		});

		return response.ok;
	} catch (error) {
		console.error('Failed to save subscription to server:', error);
		return false;
	}
}

export async function deleteSubscriptionFromServer(endpoint: string): Promise<boolean> {
	try {
		const response = await fetch('/api/notifications/subscribe', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ endpoint })
		});

		return response.ok;
	} catch (error) {
		console.error('Failed to delete subscription from server:', error);
		return false;
	}
}

export async function getVapidPublicKey(): Promise<string | null> {
	try {
		const response = await fetch('/api/notifications/vapid-public-key');
		if (!response.ok) return null;

		const data = await response.json();
		return data.publicKey;
	} catch (error) {
		console.error('Failed to fetch VAPID public key:', error);
		return null;
	}
}

// Complete flow to enable notifications
export async function enableNotifications(): Promise<{ success: boolean; error?: string }> {
	try {
		// Request permission
		const permission = await requestNotificationPermission();
		if (permission !== 'granted') {
			return { success: false, error: 'Permission denied' };
		}

		// Get VAPID public key
		const vapidKey = await getVapidPublicKey();
		if (!vapidKey) {
			return { success: false, error: 'Failed to get VAPID key' };
		}

		// Subscribe to push notifications
		const subscription = await subscribeToPushNotifications(vapidKey);
		if (!subscription) {
			return { success: false, error: 'Failed to subscribe' };
		}

		// Save to server
		const saved = await saveSubscriptionToServer(subscription);
		if (!saved) {
			return { success: false, error: 'Failed to save subscription' };
		}

		return { success: true };
	} catch (error) {
		return { success: false, error: String(error) };
	}
}

// Complete flow to disable notifications
export async function disableNotifications(): Promise<{ success: boolean; error?: string }> {
	try {
		const subscription = await getCurrentSubscription();
		if (!subscription) {
			return { success: true }; // Already unsubscribed
		}

		// Delete from server first
		await deleteSubscriptionFromServer(subscription.endpoint);

		// Unsubscribe locally
		await unsubscribeFromPushNotifications();

		return { success: true };
	} catch (error) {
		return { success: false, error: String(error) };
	}
}
