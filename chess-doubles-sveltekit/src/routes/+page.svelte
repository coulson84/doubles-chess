<script lang="ts">
  import { SignIn, SignOut } from "@auth/sveltekit/components";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import NotificationPrompt from "$lib/components/NotificationPrompt.svelte";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: games = data.games || [];

  let isCreatingGame = false;

  async function createGame() {
    isCreatingGame = true;
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const { game } = await response.json();
        // Navigate to the new game's page
        goto(`/games/${game.id}`);
      } else {
        const { error } = await response.json();
        alert(`Failed to create game: ${error}`);
        isCreatingGame = false;
      }
    } catch (error) {
      console.error("Error creating game:", error);
      alert("An error occurred while creating the game");
      isCreatingGame = false;
    }
  }

  function getStatusDisplay(status: string): string {
    switch (status) {
      case "awaitingPlayers":
        return "Awaiting Players";
      case "readyToStart":
        return "Ready to Start";
      case "inProgress":
        return "In Progress";
      case "complete":
        return "Complete";
      default:
        return status;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "awaitingPlayers":
        return "#ffc107";
      case "readyToStart":
        return "#17a2b8";
      case "inProgress":
        return "#007bff";
      case "complete":
        return "#28a745";
      default:
        return "#6c757d";
    }
  }

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

      <div class="game-actions">
        <button
          class="create-game-btn"
          on:click={createGame}
          disabled={isCreatingGame}
        >
          {isCreatingGame ? "Creating..." : "Create New Game"}
        </button>
      </div>

      <div class="content">
        <h2>Your Games</h2>
        {#if games.length === 0}
          <p class="no-games">
            You haven't created any games yet. Click "Create New Game" to get
            started!
          </p>
        {:else}
          <div class="games-list">
            {#each games as game}
              <div class="game-card">
                <div class="game-header">
                  <h3>Game {game.id.slice(0, 8)}</h3>
                  <div class="badges">
                    <span
                      class="status-badge"
                      style="background-color: {getStatusColor(game.status)}"
                    >
                      {getStatusDisplay(game.status)}
                    </span>
                    {#if game.role === 'invited'}
                      <span class="role-badge invitation">
                        {#if game.invitationStatus === 'pending'}
                          Invited
                        {:else if game.invitationStatus === 'accepted'}
                          Accepted
                        {:else}
                          Declined
                        {/if}
                      </span>
                    {:else}
                      <span class="role-badge creator">Your Game</span>
                    {/if}
                  </div>
                </div>
                <div class="game-details">
                  <p><strong>Created:</strong> {formatDate(game.createdAt)}</p>
                  <p>
                    <strong>Last Updated:</strong>
                    {formatDate(game.updatedAt)}
                  </p>
                </div>
                <div class="game-actions-row">
                  <a href="/games/{game.id}" class="btn-primary">View Game</a>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <SignOut class="sign-out-btn">
        <span slot="submitButton">Sign Out</span>
      </SignOut>
    </div>
  {:else}
    <!-- Logged Out UI -->
    <div class="logged-out">
      <h1>Welcome to Chess Doubles</h1>
      <p>Please sign in with your Google account to continue</p>

      <div class="chess-battle">
        <img src="/title_image.jpg" alt="Chess Battle" />
      </div>

      <SignIn provider="google" class="sign-in-btn">
        <span slot="submitButton">Sign in with Google</span>
      </SignIn>
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

  .chess-battle {
    margin: 3rem auto;
    max-width: 500px;
    padding: 2rem;
  }

  .chess-battle img {
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

  .game-actions {
    margin-bottom: 2rem;
    text-align: center;
  }

  .create-game-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  .create-game-btn:hover:not(:disabled) {
    background: #218838;
  }

  .create-game-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .content {
    margin-bottom: 2rem;
  }

  .content h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .no-games {
    text-align: center;
    color: #666;
    font-size: 1.1rem;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .games-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .game-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 1.5rem;
    transition:
      transform 0.2s,
      box-shadow 0.2s,
      border-color 0.2s;
  }

  .game-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    border-color: #4285f4;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .game-header h3 {
    margin: 0;
    color: #333;
    font-size: 1.25rem;
    font-family: monospace;
  }

  .badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .status-badge {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .role-badge {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .role-badge.creator {
    background: #e3f2fd;
    color: #1976d2;
  }

  .role-badge.invitation {
    background: #fff3cd;
    color: #856404;
  }

  .game-details {
    margin-bottom: 1rem;
  }

  .game-details p {
    margin: 0.5rem 0;
    color: #555;
    font-size: 0.95rem;
  }

  .game-actions-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .btn-primary {
    background: #4285f4;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    font-size: 0.95rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
    flex: 1;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn-primary:hover {
    background: #357ae8;
  }

  /* Button Styles */
  :global(.sign-in-btn),
  :global(.sign-out-btn) {
    margin-top: 2rem;
  }

  :global(.sign-in-btn button),
  :global(.sign-out-btn button) {
    background: #4285f4;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  :global(.sign-in-btn button:hover),
  :global(.sign-out-btn button:hover) {
    background: #357ae8;
  }

  :global(.sign-out-btn button) {
    background: #dc3545;
  }

  :global(.sign-out-btn button:hover) {
    background: #c82333;
  }
</style>
