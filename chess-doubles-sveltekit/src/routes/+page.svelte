<script lang="ts">
  import { SignOut } from "@auth/sveltekit/components";
  import type { PageData } from "./$types";
  import { goto, invalidateAll } from "$app/navigation";
  import NotificationPrompt from "$lib/components/NotificationPrompt.svelte";
  import { wsClient } from "$lib/websocket/client";
  import { onMount, onDestroy } from "svelte";
  import type { GameInviteReceivedPayload } from "$lib/websocket/types";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: games = data.games || [];
  $: availableGames = data.availableGames || [];

  console.log(user, games);
  let isCreatingGame = false;
  let showConfigModal = false;

  // Game configuration options
  let gameConfig = {
    isPrivate: false,
    timeLimitPerMove: null as number | null,
    isRated: false,
    teamAssignment: 'manual' as 'manual' | 'random'
  };

  // Time limit options in seconds
  const timeLimitOptions = [
    { label: 'No limit', value: null },
    { label: '1 minute', value: 60 },
    { label: '10 minutes', value: 600 },
    { label: '1 hour', value: 3600 },
    { label: '12 hours', value: 43200 },
    { label: '1 day', value: 86400 },
    { label: '3 days', value: 259200 }
  ];

  // WebSocket connection
  onMount(() => {
    if (user?.id) {
      wsClient.connect(user.id);

      // Handle game invitation received
      const unsubInvite = wsClient.on('game_invite_received', async (payload) => {
        const data = payload as GameInviteReceivedPayload;
        console.log('Received game invitation:', data);

        // Refresh the page data to show new invitation
        await invalidateAll();
      });

      return () => {
        unsubInvite();
      };
    }
  });

  onDestroy(() => {
    wsClient.disconnect();
  });

  function openConfigModal() {
    showConfigModal = true;
  }

  function closeConfigModal() {
    showConfigModal = false;
  }

  async function createGame() {
    isCreatingGame = true;
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameConfig)
      });

      if (response.ok) {
        const { game } = await response.json();
        // Reset config and close modal
        closeConfigModal();
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
          on:click={openConfigModal}
          disabled={isCreatingGame}
        >
          Create New Game
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
              <div class="game-card" class:your-turn={game.isYourTurn}>
                <div class="game-header">
                  <h3>Game {game.id.slice(0, 8)}</h3>
                  <div class="badges">
                    {#if game.isYourTurn}
                      <span class="role-badge your-turn-badge">Your Turn</span>
                    {/if}
                    <span
                      class="status-badge"
                      style="background-color: {getStatusColor(game.status)}"
                    >
                      {getStatusDisplay(game.status)}
                    </span>
                    {#if game.role === "invited"}
                      <span class="role-badge invitation">
                        {#if game.invitationStatus === "pending"}
                          Invited
                        {:else if game.invitationStatus === "accepted"}
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

      <div class="content">
        <div class="section-header">
          <h2>Available Games</h2>
          <button
            class="refresh-btn"
            on:click={() => invalidateAll()}
            title="Refresh available games"
          >
            🔄
          </button>
        </div>
        {#if availableGames.length === 0}
          <p class="no-games">
            No public games available. Create a new game to get started!
          </p>
        {:else}
          <div class="games-list">
            {#each availableGames as game}
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
                    <span class="role-badge public">Public</span>
                  </div>
                </div>
                <div class="game-details">
                  <p><strong>Created:</strong> {formatDate(game.createdAt)}</p>
                  <p>
                    <strong>Last Updated:</strong>
                    {formatDate(game.updatedAt)}
                  </p>
                  {#if game.timeLimitPerMove}
                    <p><strong>Time Per Move:</strong> {game.timeLimitPerMove}s</p>
                  {/if}
                  {#if game.isRated}
                    <p><strong>Rated Game</strong></p>
                  {/if}
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

    <!-- Game Configuration Modal -->
    {#if showConfigModal}
      <div class="modal-overlay" on:click={closeConfigModal}>
        <div class="modal-content" on:click|stopPropagation>
          <div class="modal-header">
            <h2>Game Configuration</h2>
            <button class="close-btn" on:click={closeConfigModal}>×</button>
          </div>

          <div class="modal-body">
            <div class="config-section">
              <label class="config-label">
                <input type="checkbox" bind:checked={gameConfig.isPrivate} />
                <span>Private Game</span>
              </label>
              <p class="help-text">Private games won't appear in public listings</p>
            </div>

            <div class="config-section">
              <label class="config-label-block">
                <span>Time Limit Per Move</span>
                <select bind:value={gameConfig.timeLimitPerMove}>
                  {#each timeLimitOptions as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </label>
              <p class="help-text">Maximum time allowed for each move (currently not enforced during gameplay)</p>
            </div>

            <div class="config-section">
              <label class="config-label">
                <input type="checkbox" bind:checked={gameConfig.isRated} />
                <span>Rated Game</span>
              </label>
              <p class="help-text">Rated games will affect player rankings (currently not enforced during gameplay)</p>
            </div>

            <div class="config-section">
              <label class="config-label-block">
                <span>Team Assignment</span>
                <select bind:value={gameConfig.teamAssignment}>
                  <option value="manual">Manual</option>
                  <option value="random">Random</option>
                </select>
              </label>
              <p class="help-text">Manual: Players choose teams. Random: Teams assigned automatically (currently not enforced during gameplay)</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" on:click={closeConfigModal}>
              Cancel
            </button>
            <button
              class="btn-primary-modal"
              on:click={createGame}
              disabled={isCreatingGame}
            >
              {isCreatingGame ? "Creating..." : "Create Game"}
            </button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <!-- Logged Out UI -->
    <div class="logged-out">
      <h1>Welcome to Chess Doubles</h1>
      <p>Sign in or create an account to start playing</p>

      <div class="chess-battle">
        <img src="/title_image.jpg" alt="Chess Battle" />
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

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 2rem;
    margin: 0;
    color: #333;
  }

  .refresh-btn {
    background: #f0f0f0;
    border: none;
    font-size: 1.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .refresh-btn:hover {
    background: #e0e0e0;
    transform: rotate(90deg);
  }

  .refresh-btn:active {
    transform: rotate(180deg);
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

  .game-card.your-turn {
    border-color: #ff9800;
    background: #fff8e1;
  }

  .game-card.your-turn:hover {
    border-color: #f57c00;
    box-shadow: 0 6px 16px rgba(255, 152, 0, 0.3);
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

  .role-badge.public {
    background: #d4edda;
    color: #155724;
  }

  .role-badge.your-turn-badge {
    background: #ff9800;
    color: white;
    font-weight: 700;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
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

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #666;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: #f0f0f0;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .config-section {
    margin-bottom: 1.5rem;
  }

  .config-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }

  .config-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .config-label-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-label-block span {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }

  .config-label-block select {
    padding: 0.75rem;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
    cursor: pointer;
  }

  .help-text {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: #666;
    line-height: 1.4;
  }

  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e0e0e0;
  }

  .btn-secondary {
    flex: 1;
    background: #f0f0f0;
    color: #333;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  .btn-primary-modal {
    flex: 1;
    background: #28a745;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  .btn-primary-modal:hover:not(:disabled) {
    background: #218838;
  }

  .btn-primary-modal:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
</style>
