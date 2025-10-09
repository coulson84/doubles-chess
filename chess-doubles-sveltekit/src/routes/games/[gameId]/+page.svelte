<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: game = data.game;

  function getStatusDisplay(status: string): string {
    switch (status) {
      case 'awaitingPlayers':
        return 'Awaiting Players';
      case 'readyToStart':
        return 'Ready to Start';
      case 'inProgress':
        return 'In Progress';
      case 'complete':
        return 'Complete';
      default:
        return status;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'awaitingPlayers':
        return '#ffc107';
      case 'readyToStart':
        return '#17a2b8';
      case 'inProgress':
        return '#007bff';
      case 'complete':
        return '#28a745';
      default:
        return '#6c757d';
    }
  }

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleString();
  }

  function goHome() {
    goto('/');
  }

  // Determine if we should show lobby or game board
  $: isLobby = game.status === 'awaitingPlayers' || game.status === 'readyToStart';
  $: isCreator = user?.id === game.createdBy;
</script>

<div class="container">
  {#if !user}
    <div class="auth-required">
      <h1>Sign In Required</h1>
      <p>You must be signed in to view this game.</p>
      <a href="/" class="btn-primary">Go to Sign In</a>
    </div>
  {:else if isLobby}
    <!-- Lobby View -->
    <div class="lobby-view">
      <div class="lobby-header">
        <div class="header-content">
          <div class="title-section">
            <h1>Game Lobby</h1>
            <span
              class="status-badge"
              style="background-color: {getStatusColor(game.status)}"
            >
              {getStatusDisplay(game.status)}
            </span>
          </div>
          <button class="btn-secondary" on:click={goHome}>
            ← Back to Home
          </button>
        </div>
      </div>

      <div class="lobby-content">
        <div class="game-info-card">
          <h2>Game Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Game ID:</span>
              <span class="value mono">{game.id}</span>
            </div>
            <div class="info-item">
              <span class="label">Created:</span>
              <span class="value">{formatDate(game.createdAt)}</span>
            </div>
            <div class="info-item">
              <span class="label">Last Updated:</span>
              <span class="value">{formatDate(game.updatedAt)}</span>
            </div>
            <div class="info-item">
              <span class="label">Your Role:</span>
              <span class="value">{isCreator ? 'Game Creator' : 'Player'}</span>
            </div>
          </div>
        </div>

        <div class="players-section">
          <h2>Players</h2>
          <div class="players-grid">
            <div class="player-slot filled">
              <div class="player-icon">👤</div>
              <div class="player-info">
                <div class="player-name">{isCreator ? 'You' : 'Player 1'}</div>
                <div class="player-status">Creator</div>
              </div>
            </div>
            <div class="player-slot empty">
              <div class="player-icon">⭕</div>
              <div class="player-info">
                <div class="player-name">Waiting for player...</div>
              </div>
            </div>
            <div class="player-slot empty">
              <div class="player-icon">⭕</div>
              <div class="player-info">
                <div class="player-name">Waiting for player...</div>
              </div>
            </div>
            <div class="player-slot empty">
              <div class="player-icon">⭕</div>
              <div class="player-info">
                <div class="player-name">Waiting for player...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="lobby-actions">
          {#if isCreator}
            <button class="btn-primary" disabled>
              Waiting for Players (1/4)
            </button>
            <p class="help-text">
              Share the game ID with your friends to invite them to join!
            </p>
          {:else}
            <button class="btn-primary">
              Ready to Play
            </button>
          {/if}
        </div>
      </div>
    </div>
  {:else if game.status === 'inProgress'}
    <!-- Game Board View (placeholder) -->
    <div class="game-view">
      <h1>Chess Doubles - Game In Progress</h1>
      <p>Game board coming soon...</p>
      <button class="btn-secondary" on:click={goHome}>← Back to Home</button>
    </div>
  {:else if game.status === 'complete'}
    <!-- Completed Game View (placeholder) -->
    <div class="game-view">
      <h1>Game Complete</h1>
      <p>This game has ended.</p>
      <button class="btn-secondary" on:click={goHome}>← Back to Home</button>
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

  .auth-required {
    text-align: center;
    padding: 4rem 2rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .auth-required h1 {
    color: #333;
    margin-bottom: 1rem;
  }

  .auth-required p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 1.5rem;
  }

  .lobby-header {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h1 {
    font-size: 2.5rem;
    color: #333;
    margin: 0;
  }

  h2 {
    font-size: 1.5rem;
    color: #333;
    margin: 0 0 1rem 0;
  }

  .status-badge {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lobby-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .game-info-card {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .label {
    color: #666;
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: #333;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .mono {
    font-family: monospace;
    font-size: 0.95rem;
  }

  .players-section {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 2rem;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .player-slot {
    background: #f8f9fa;
    border: 2px dashed #d0d0d0;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s;
  }

  .player-slot.filled {
    background: #e3f2fd;
    border: 2px solid #2196f3;
    border-style: solid;
  }

  .player-slot.empty {
    opacity: 0.6;
  }

  .player-icon {
    font-size: 2.5rem;
  }

  .player-info {
    flex: 1;
  }

  .player-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .player-status {
    font-size: 0.85rem;
    color: #666;
  }

  .lobby-actions {
    text-align: center;
    padding: 2rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .help-text {
    margin-top: 1rem;
    color: #666;
    font-size: 0.95rem;
  }

  .btn-primary,
  .btn-secondary {
    padding: 1rem 2rem;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    text-decoration: none;
    display: inline-block;
  }

  .btn-primary {
    background: #28a745;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #218838;
  }

  .btn-primary:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .game-view {
    padding: 4rem 2rem;
    text-align: center;
  }

  .game-view h1 {
    margin-bottom: 1rem;
  }

  .game-view p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
