// Register the service worker for push notifications

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) {
		console.warn('Service workers not supported');
		return null;
	}

	try {
		// In development, we need to explicitly register the service worker
		// In production, SvelteKit will automatically register it
		let registration = await navigator.serviceWorker.getRegistration();

		if (!registration) {
			console.log('No service worker found, registering...');
			registration = await navigator.serviceWorker.register('/service-worker.js', {
				type: 'module'
			});
			console.log('Service Worker registered:', registration);
		} else {
			console.log('Service Worker already registered:', registration);
		}

		await registration.update();
		return registration;
	} catch (error) {
		console.error('Service Worker registration failed:', error);
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
