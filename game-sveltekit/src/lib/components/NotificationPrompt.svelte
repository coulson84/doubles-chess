<script lang="ts">
	import { onMount } from 'svelte';
	import { enableNotifications } from '$lib/notifications/client';

	let showPrompt = $state(false);
	let isEnabling = $state(false);
	let errorMessage = $state('');

	const DISMISS_KEY = 'notification-prompt-dismissed';
	const DISMISS_FOREVER_KEY = 'notification-prompt-dismissed-forever';

	onMount(() => {
		// Disable in development to avoid Chrome permission issues
		const isDev = import.meta.env.DEV;
		if (isDev) {
			console.log('[NotificationPrompt] Disabled in development mode');
			return;
		}

		// Check if notifications are supported
		if (!('Notification' in window) || !('serviceWorker' in navigator)) {
			return;
		}

		// Check if dismissed forever
		const dismissedForever = localStorage.getItem(DISMISS_FOREVER_KEY);
		if (dismissedForever === 'true') {
			return;
		}

		// Check if already granted
		if (Notification.permission === 'granted') {
			return;
		}

		// Check if dismissed for this session
		const dismissedThisSession = sessionStorage.getItem(DISMISS_KEY);
		if (dismissedThisSession === 'true') {
			return;
		}

		// Show the prompt after a short delay
		setTimeout(() => {
			showPrompt = true;
		}, 1000);
	});

	async function handleEnable(event: MouseEvent) {
		// Prevent any async breaks in the user gesture chain
		event.preventDefault();
		event.stopPropagation();

		isEnabling = true;
		errorMessage = '';

		// Request permission immediately in the click handler to preserve user gesture
		if (!('Notification' in window)) {
			errorMessage = 'Notifications not supported';
			isEnabling = false;
			return;
		}

		try {
			// This must happen synchronously in the click handler
			const permission = await Notification.requestPermission();

			if (permission !== 'granted') {
				errorMessage = 'Permission denied';
				isEnabling = false;
				return;
			}

			// Now continue with the rest of the flow
			const result = await enableNotifications();

			if (result.success) {
				showPrompt = false;
			} else {
				errorMessage = result.error || 'Failed to enable notifications';
				isEnabling = false;
			}
		} catch (error) {
			errorMessage = String(error);
			isEnabling = false;
		}
	}

	function handleDismiss() {
		sessionStorage.setItem(DISMISS_KEY, 'true');
		showPrompt = false;
	}

	function handleDismissForever() {
		localStorage.setItem(DISMISS_FOREVER_KEY, 'true');
		showPrompt = false;
	}
</script>

{#if showPrompt}
	<div class="notification-prompt">
		<div class="prompt-content">
			<div class="icon">🔔</div>
			<div class="text">
				<h4>Enable Notifications</h4>
				<p>Stay updated on game invites, moves, and friend requests</p>
			</div>
			<button
				class="close-btn"
				onclick={handleDismiss}
				aria-label="Dismiss"
			>
				×
			</button>
		</div>

		{#if errorMessage}
			<div class="error">{errorMessage}</div>
		{/if}

		<div class="actions">
			<button
				class="btn-enable"
				onclick={handleEnable}
				disabled={isEnabling}
			>
				{isEnabling ? 'Enabling...' : 'Enable'}
			</button>
			<button
				class="btn-never"
				onclick={handleDismissForever}
				disabled={isEnabling}
			>
				Don't ask again
			</button>
		</div>
	</div>
{/if}

<style>
	.notification-prompt {
		position: fixed;
		top: 1rem;
		right: 1rem;
		width: 320px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 1rem;
		z-index: 1000;
		animation: slideIn 0.3s ease-out;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
			Ubuntu, Cantarell, sans-serif;
	}

	@keyframes slideIn {
		from {
			transform: translateX(400px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.prompt-content {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.text {
		flex: 1;
	}

	.text h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.text p {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.4;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #999;
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background 0.2s, color 0.2s;
		flex-shrink: 0;
	}

	.close-btn:hover {
		background: #f0f0f0;
		color: #333;
	}

	.error {
		margin-bottom: 0.75rem;
		padding: 0.5rem;
		background: #fee;
		color: #c33;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-enable,
	.btn-never {
		flex: 1;
		padding: 0.6rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-enable {
		background: #4285f4;
		color: white;
	}

	.btn-enable:hover:not(:disabled) {
		background: #357ae8;
	}

	.btn-enable:disabled {
		background: #9db9f5;
		cursor: not-allowed;
	}

	.btn-never {
		background: #f0f0f0;
		color: #666;
	}

	.btn-never:hover:not(:disabled) {
		background: #e0e0e0;
		color: #333;
	}

	.btn-never:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.notification-prompt {
			top: 0.5rem;
			right: 0.5rem;
			left: 0.5rem;
			width: auto;
		}
	}
</style>
