// Register the service worker for push notifications

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) {
		console.warn('Service workers not supported');
		return null;
	}

	try {
		// SvelteKit automatically registers the service worker from src/service-worker.js
		// We just need to wait for it to be ready
		const registration = await navigator.serviceWorker.ready;
		console.log('Service Worker ready:', registration);
		return registration;
	} catch (error) {
		console.error('Service Worker not available:', error);
		return null;
	}
}

export function unregisterServiceWorker(): Promise<boolean> {
	if (!('serviceWorker' in navigator)) {
		return Promise.resolve(false);
	}

	return navigator.serviceWorker.getRegistration('/service-worker.js')
		.then((registration) => {
			if (registration) {
				return registration.unregister();
			}
			return false;
		});
}
