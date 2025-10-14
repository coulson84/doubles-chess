<script lang="ts">
  import { SignOut } from "@auth/sveltekit/components";
  import type { PageData } from "./$types";
  import NotificationPrompt from "$lib/components/NotificationPrompt.svelte";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleString();
  }
</script>

<NotificationPrompt />

<div class="container">
  {#if user}
    <!-- Logged In UI -->
    <div class="logged-in">
      <header>
        <h1>Welcome back, {user.name || "User"}!</h1>
        {#if user.image}
          <img
            src={user.image}
            alt={user.name || "User avatar"}
            class="avatar"
          />
        {/if}
      </header>

      <div class="user-info">
        <h2>Your Profile</h2>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <div class="content"></div>

      <SignOut class="sign-out-btn">
        <span slot="submitButton">Sign Out</span>
      </SignOut>
    </div>
  {:else}
    <!-- Logged Out UI -->
    <div class="logged-out">
      <h1>Welcome to XXGAMEXX</h1>
      <p>Sign in or create an account to start playing</p>

      <div class="game-title-image">
        <img src="/title_image.jpg" alt="Game Title" />
      </div>

      <a href="/auth" class="auth-btn"> Get Started </a>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  /* Logged Out Styles */
  .logged-out {
    text-align: center;
    padding: 4rem 2rem;
  }

  .logged-out h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .logged-out > p {
    font-size: 1.25rem;
    color: #666;
    margin-bottom: 3rem;
  }

  .game-title-image {
    margin: 3rem auto;
    max-width: 500px;
    padding: 2rem;
  }

  .game-title-image img {
    width: 100%;
    height: auto;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  }

  /* Logged In Styles */
  .logged-in {
    padding: 2rem 0;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 2px solid #e0e0e0;
  }

  header h1 {
    font-size: 2.5rem;
    color: #333;
    margin: 0;
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid #4285f4;
  }

  .user-info {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .user-info h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.5rem;
  }

  .user-info p {
    margin: 0.5rem 0;
    color: #555;
  }

  .content {
    margin-bottom: 2rem;
  }

  /* Button Styles */
  .auth-btn {
    display: inline-block;
    margin-top: 2rem;
    background: #667eea;
    color: white;
    border: none;
    padding: 1rem 2.5rem;
    font-size: 1.1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
    text-decoration: none;
  }

  .auth-btn:hover {
    background: #5568d3;
  }

  :global(.sign-out-btn) {
    margin-top: 2rem;
  }

  :global(.sign-out-btn button) {
    background: #dc3545;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  :global(.sign-out-btn button:hover) {
    background: #c82333;
  }
</style>
