<script lang="ts">
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: game = data.game;
  $: invitations = data.invitations || [];
  $: totalPlayers = 1 + invitations.length; // Creator + invited players
  $: canInviteMore = totalPlayers < 4;

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

  // Invite players functionality
  type SearchUser = {
    id: string;
    name: string;
    email: string;
    image?: string;
    is_friend: boolean;
  };

  let searchQuery = '';
  let searchResults: SearchUser[] = [];
  let isSearching = false;
  let showDropdown = false;
  let searchTimeout: number;

  async function searchUsers(query: string) {
    isSearching = true;
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        searchResults = data.users || [];
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      isSearching = false;
    }
  }

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery = target.value;

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search - wait 300ms after user stops typing
    searchTimeout = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300) as unknown as number;
  }

  function handleSearchFocus() {
    showDropdown = true;
    // Load friends if search is empty
    if (!searchQuery) {
      searchUsers('');
    }
  }

  function handleSearchBlur() {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }

  let inviteError = '';
  let inviteSuccess = '';

  async function inviteUser(userId: string) {
    inviteError = '';
    inviteSuccess = '';

    // Check if we can invite more players
    if (!canInviteMore) {
      inviteError = 'Maximum 4 players (1 creator + 3 invited)';
      return;
    }

    try {
      const response = await fetch(`/api/games/${game.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const userName = searchResults.find(u => u.id === userId)?.name || 'User';
        inviteSuccess = `Invited ${userName} to the game!`;
        searchQuery = '';
        showDropdown = false;

        // Reload the page to show the new invitation
        goto(window.location.pathname, { invalidateAll: true });

        // Clear success message after 3 seconds
        setTimeout(() => {
          inviteSuccess = '';
        }, 3000);
      } else {
        const error = await response.json();
        inviteError = error.error || 'Failed to send invitation';
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      inviteError = 'An error occurred while sending the invitation';
    }
  }
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
          <div class="players-header">
            <h2>Players</h2>
            <div class="invite-container">
              {#if inviteSuccess}
                <div class="invite-message success">{inviteSuccess}</div>
              {/if}
              {#if inviteError}
                <div class="invite-message error">{inviteError}</div>
              {/if}
              <input
                type="text"
                placeholder={canInviteMore ? "Invite players" : "Maximum players reached (4/4)"}
                class="invite-input"
                bind:value={searchQuery}
                on:input={handleSearchInput}
                on:focus={handleSearchFocus}
                on:blur={handleSearchBlur}
                disabled={!canInviteMore}
              />
              {#if showDropdown}
                <div class="search-dropdown">
                  {#if isSearching}
                    <div class="search-loading">Searching...</div>
                  {:else if searchResults.length === 0}
                    <div class="search-empty">
                      {#if searchQuery.trim()}
                        No users found
                      {:else}
                        Search for players to invite
                      {/if}
                    </div>
                  {:else}
                    {#each searchResults as user}
                      <button
                        class="search-result-item"
                        on:click={() => inviteUser(user.id)}
                      >
                        <div class="result-avatar">
                          {#if user.image}
                            <img src={user.image} alt={user.name} />
                          {:else}
                            <div class="avatar-placeholder">
                              {user.name?.charAt(0) || '?'}
                            </div>
                          {/if}
                        </div>
                        <div class="result-info">
                          <div class="result-name">
                            {user.name}
                            {#if user.is_friend}
                              <span class="friend-badge">Friend</span>
                            {/if}
                          </div>
                          <div class="result-email">{user.email}</div>
                        </div>
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          </div>
          <div class="players-grid">
            <!-- Creator slot -->
            <div class="player-slot filled">
              <div class="player-icon">👤</div>
              <div class="player-info">
                <div class="player-name">{isCreator ? 'You' : 'Player 1'}</div>
                <div class="player-status">Creator</div>
              </div>
            </div>

            <!-- Invited player slots -->
            {#each invitations as invitation}
              <div class="player-slot pending">
                {#if invitation.invitedUser.image}
                  <img src={invitation.invitedUser.image} alt={invitation.invitedUser.name} class="player-avatar" />
                {:else}
                  <div class="player-icon">{invitation.invitedUser.name?.charAt(0) || '?'}</div>
                {/if}
                <div class="player-info">
                  <div class="player-name">{invitation.invitedUser.name}</div>
                  <div class="player-status">Invited (Pending)</div>
                </div>
              </div>
            {/each}

            <!-- Empty slots -->
            {#each Array(3 - invitations.length) as _, i}
              <div class="player-slot empty">
                <div class="player-icon">⭕</div>
                <div class="player-info">
                  <div class="player-name">Waiting for player...</div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="lobby-actions">
          {#if isCreator}
            <button class="btn-primary" disabled>
              Waiting for Players ({totalPlayers}/4)
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

  .players-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .players-header h2 {
    margin: 0;
  }

  .invite-container {
    position: relative;
    flex: 1;
    max-width: 400px;
  }

  .invite-message {
    position: absolute;
    top: -2.5rem;
    right: 0;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    animation: slideDown 0.3s ease-out;
  }

  .invite-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .invite-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .invite-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .invite-input:focus {
    outline: none;
    border-color: #4285f4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  }

  .invite-input:disabled {
    background: #f0f0f0;
    color: #999;
    cursor: not-allowed;
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
  }

  .search-loading,
  .search-empty {
    padding: 1rem;
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }

  .search-result-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: none;
    background: white;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .search-result-item:hover {
    background: #f8f9fa;
  }

  .search-result-item:not(:last-child) {
    border-bottom: 1px solid #e0e0e0;
  }

  .result-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }

  .result-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #4285f4;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.2rem;
    text-transform: uppercase;
  }

  .result-info {
    flex: 1;
    min-width: 0;
  }

  .result-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .result-email {
    font-size: 0.85rem;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .friend-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #28a745;
    color: white;
    font-size: 0.7rem;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
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

  .player-slot.pending {
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-style: solid;
  }

  .player-slot.empty {
    opacity: 0.6;
  }

  .player-icon {
    font-size: 2.5rem;
  }

  .player-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
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

    .players-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .invite-container {
      max-width: 100%;
    }

    .players-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
