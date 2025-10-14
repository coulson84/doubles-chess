<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";

  export let data: PageData;

  $: game = data.game;
  $: gameState = game.game_state || {};

  async function updateGameState(newState: any) {
    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          game_state: newState
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      const { game: updatedGame } = await response.json();
      game = updatedGame;
    } catch (error) {
      console.error('Error updating game:', error);
      alert('Failed to update game. Please try again.');
    }
  }

  async function endGame() {
    if (!confirm('Are you sure you want to end this game?')) {
      return;
    }

    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end game');
      }

      goto('/');
    } catch (error) {
      console.error('Error ending game:', error);
      alert('Failed to end game. Please try again.');
    }
  }

  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleString();
  }
</script>

<div class="container">
  <header>
    <div class="header-content">
      <h1>Game in Progress</h1>
      <div class="game-meta">
        <span class="status-badge status-{game.status}">
          {game.status.replace('_', ' ')}
        </span>
        <span class="created-date">
          Started: {formatDate(game.created_at)}
        </span>
      </div>
    </div>
  </header>

  <div class="game-area">
    <div class="game-placeholder">
      <p>Game ID: {game.id}</p>
      <p>Your game will be displayed here.</p>
      <p class="hint">Add your game logic and UI in this component.</p>
    </div>
  </div>

  <div class="game-actions">
    <button on:click={() => goto('/')} class="btn btn-secondary">
      Back to Home
    </button>
    <button on:click={endGame} class="btn btn-danger">
      End Game
    </button>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  header {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .header-content h1 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 2.5rem;
  }

  .game-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .status-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-in_progress {
    background: #e3f2fd;
    color: #1976d2;
  }

  .status-completed {
    background: #e8f5e9;
    color: #388e3c;
  }

  .created-date {
    color: #666;
    font-size: 0.875rem;
  }

  .game-area {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 3rem;
    margin-bottom: 2rem;
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .game-placeholder {
    text-align: center;
    color: #666;
  }

  .game-placeholder p {
    margin: 0.5rem 0;
    font-size: 1.1rem;
  }

  .game-placeholder .hint {
    margin-top: 2rem;
    font-style: italic;
    color: #999;
    font-size: 0.95rem;
  }

  .game-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background: #c82333;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header-content h1 {
      font-size: 2rem;
    }

    .game-area {
      padding: 2rem 1rem;
      min-height: 400px;
    }

    .game-actions {
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
    }
  }
</style>
