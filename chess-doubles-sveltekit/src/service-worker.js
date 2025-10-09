/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// Service Worker for handling push notifications

sw.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}

	try {
		const data = event.data.json();
		const { title, body, icon, badge, tag, requireInteraction, data: notificationData } = data;

		const options = {
			body,
			icon: icon || '/favicon.svg',
			badge: badge || '/favicon.svg',
			tag: tag || 'default',
			requireInteraction: requireInteraction || false,
			data: notificationData || {},
			vibrate: [200, 100, 200],
		};

		event.waitUntil(
			sw.registration.showNotification(title, options)
		);
	} catch (error) {
		console.error('Error handling push notification:', error);
	}
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/';

	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
			.then((clientList) => {
				// Check if there's already a window open
				for (const client of clientList) {
					if (client.url === urlToOpen && 'focus' in client) {
						return client.focus();
					}
				}
				// If not, open a new window
				if (sw.clients.openWindow) {
					return sw.clients.openWindow(urlToOpen);
				}
			})
	);
});

sw.addEventListener('notificationclose', (event) => {
	// Track notification closure if needed
	console.log('Notification closed:', event.notification.tag);
});

// Handle service worker installation
sw.addEventListener('install', (event) => {
	console.log('Service Worker installed');
	sw.skipWaiting();
});

// Handle service worker activation
sw.addEventListener('activate', (event) => {
	console.log('Service Worker activated');
	event.waitUntil(sw.clients.claim());
});
