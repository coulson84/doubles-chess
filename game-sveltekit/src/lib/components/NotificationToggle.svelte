<script lang="ts">
  import { onMount } from "svelte";
  import {
    enableNotifications,
    disableNotifications,
    getCurrentSubscription,
  } from "$lib/notifications/client";

  let notificationStatus: "enabled" | "disabled" | "loading" | "unsupported" =
    "loading";
  let isToggling = false;
  let errorMessage = "";

  onMount(async () => {
    // Check if notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      notificationStatus = "unsupported";
      return;
    }

    // Check current subscription status
    const subscription = await getCurrentSubscription();
    notificationStatus = subscription ? "enabled" : "disabled";
  });

  async function toggleNotifications() {
    if (isToggling || notificationStatus === "unsupported") return;

    isToggling = true;
    errorMessage = "";

    try {
      if (notificationStatus === "disabled") {
        const result = await enableNotifications();
        if (result.success) {
          notificationStatus = "enabled";
        } else {
          errorMessage = result.error || "Failed to enable notifications";
        }
      } else {
        const result = await disableNotifications();
        if (result.success) {
          notificationStatus = "disabled";
        } else {
          errorMessage = result.error || "Failed to disable notifications";
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      errorMessage = "An unexpected error occurred";
    } finally {
      isToggling = false;
    }
  }
</script>

<div class="notification-toggle">
  <div class="toggle-header">
    <h3>🔔 Push Notifications</h3>
    {#if notificationStatus === "unsupported"}
      <span class="status-text unsupported">Not Supported</span>
    {:else if notificationStatus === "enabled"}
      <span class="status-text enabled">Enabled</span>
    {:else if notificationStatus === "disabled"}
      <span class="status-text disabled">Disabled</span>
    {:else}
      <span class="status-text loading">Checking...</span>
    {/if}
  </div>

  <p class="description">
    {#if notificationStatus === "unsupported"}
      Your browser doesn't support push notifications.
    {:else}
      Get notified about games, and friend requests.
    {/if}
  </p>

  {#if notificationStatus !== "unsupported" && notificationStatus !== "loading"}
    <button
      class="toggle-button"
      class:enabled={notificationStatus === "enabled"}
      on:click={toggleNotifications}
      disabled={isToggling}
    >
      {#if isToggling}
        {notificationStatus === "enabled" ? "Disabling..." : "Enabling..."}
      {:else}
        {notificationStatus === "enabled"
          ? "Disable Notifications"
          : "Enable Notifications"}
      {/if}
    </button>
  {/if}

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
</div>

<style>
  .notification-toggle {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1rem 0;
  }

  .toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .toggle-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #333;
  }

  .status-text {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-text.enabled {
    background: #28a745;
    color: white;
  }

  .status-text.disabled {
    background: #6c757d;
    color: white;
  }

  .status-text.unsupported {
    background: #dc3545;
    color: white;
  }

  .status-text.loading {
    background: #ffc107;
    color: #333;
  }

  .description {
    color: #666;
    margin: 0.5rem 0 1rem;
    font-size: 0.95rem;
  }

  .toggle-button {
    width: 100%;
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    background: #4285f4;
    color: white;
  }

  .toggle-button:hover:not(:disabled) {
    background: #357ae8;
  }

  .toggle-button.enabled {
    background: #dc3545;
  }

  .toggle-button.enabled:hover:not(:disabled) {
    background: #c82333;
  }

  .toggle-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #f8d7da;
    color: #721c24;
    border-radius: 6px;
    font-size: 0.9rem;
  }
</style>
