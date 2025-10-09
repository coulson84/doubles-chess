<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { registerServiceWorker } from '$lib/notifications/register-sw';

	let { children } = $props();

	onMount(() => {
		// Register service worker for push notifications
		registerServiceWorker();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
