<script lang="ts">
  import type { PageData } from "./$types";
  import { goto, invalidateAll } from "$app/navigation";
  import { wsClient } from "$lib/websocket/client";
  import { onMount, onDestroy } from "svelte";
  import type { GameInviteResponsePayload } from "$lib/websocket/types";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: game = data.game;
  $: invitations = data.invitations || [];
  $: myInvitation = data.myInvitation;
  $: totalPlayers = 1 + invitations.length; // Creator + invited players
  $: isCreator = user?.id === game?.createdBy;
  // Determine if we should show lobby or game board
  $: isLobby =
    game.status === "awaitingPlayers" || game.status === "readyToStart";

  // WebSocket connection
  onMount(() => {
    if (user?.id) {
      wsClient.connect(user.id);

      // Handle invitation accepted
      const unsubAccepted = wsClient.on(
        "game_invite_accepted",
        async (payload) => {
          const data = payload as GameInviteResponsePayload;
          if (data.gameId === game.id) {
            console.log(`${data.userName} accepted the invitation!`);
            await invalidateAll();
          }
        }
      );

      // Handle invitation declined
      const unsubDeclined = wsClient.on(
        "game_invite_declined",
        async (payload) => {
          const data = payload as GameInviteResponsePayload;
          if (data.gameId === game.id) {
            console.log(`${data.userName} declined the invitation`);
            await invalidateAll();
          }
        }
      );

      // Handle player ejected
      const unsubEjected = wsClient.on(
        "player_ejected",
        async (payload: any) => {
          if (payload.gameId === game.id) {
            alert(payload.message);
            goto("/");
          }
        }
      );

      return () => {
        unsubAccepted();
        unsubDeclined();
        unsubEjected();
      };
    }
  });

  onDestroy(() => {
    wsClient.disconnect();
  });

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

  function goHome() {
    goto("/");
  }

  // Invite players functionality
  type SearchUser = {
    id: string;
    name: string;
    email: string;
    image?: string;
    is_friend: boolean;
  };

  let searchQuery = "";
  let searchResults: SearchUser[] = [];
  let isSearching = false;
  let showDropdown = false;
  let searchTimeout: number;

  async function searchUsers(query: string) {
    isSearching = true;
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}&gameId=${game.id}`
      );
      if (response.ok) {
        const data = await response.json();
        searchResults = data.users || [];
      }
    } catch (error) {
      console.error("Error searching users:", error);
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
      searchUsers("");
    }
  }

  function handleSearchBlur() {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }

  let inviteError = "";
  let inviteSuccess = "";

  async function inviteUser(userId: string) {
    inviteError = "";
    inviteSuccess = "";

    // Check if we can invite more players
    try {
      const response = await fetch(`/api/games/${game.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const userName =
          searchResults.find((u) => u.id === userId)?.name || "User";
        inviteSuccess = `Invited ${userName} to the game!`;
        searchQuery = "";
        showDropdown = false;

        // Reload the page to show the new invitation
        goto(window.location.pathname, { invalidateAll: true });

        // Clear success message after 3 seconds
        setTimeout(() => {
          inviteSuccess = "";
        }, 3000);
      } else {
        const error = await response.json();
        inviteError = error.error || "Failed to send invitation";
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      inviteError = "An error occurred while sending the invitation";
    }
  }

  let isResponding = false;
  let respondError = "";

  async function respondToInvitation(status: "accepted" | "declined") {
    if (!myInvitation) return;

    isResponding = true;
    respondError = "";

    try {
      const response = await fetch(
        `/api/invitations/${myInvitation.id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        // Reload the page to reflect the updated status
        goto(window.location.pathname, { invalidateAll: true });
      } else {
        const error = await response.json();
        respondError = error.error || "Failed to respond to invitation";
        isResponding = false;
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      respondError = "An error occurred while responding";
      isResponding = false;
    }
  }

  async function startGame() {
    try {
      const response = await fetch(`/api/games/${game.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Reload to show the game in progress
        goto(window.location.pathname, { invalidateAll: true });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to start game");
      }
    } catch (error) {
      console.error("Error starting game:", error);
      alert("An error occurred while starting the game");
    }
  }

  // Game settings
  let showSettingsModal = false;
  let isSavingSettings = false;
  let gameSettings = {
    isPrivate: false,
    timeLimitPerMove: null,
    isRated: false,
    teamAssignment: 'manual' as 'manual' | 'random'
  };

  $: if (game) {
    // Update settings when game changes
    gameSettings = {
      isPrivate: game.isPrivate ?? false,
      timeLimitPerMove: game.timeLimitPerMove ?? null,
      isRated: game.isRated ?? false,
      teamAssignment: game.teamAssignment ?? 'manual'
    };
  }

  const timeLimitOptions = [
    { label: 'No limit', value: null },
    { label: '1 minute', value: 60 },
    { label: '10 minutes', value: 600 },
    { label: '1 hour', value: 3600 },
    { label: '12 hours', value: 43200 },
    { label: '1 day', value: 86400 },
    { label: '3 days', value: 259200 }
  ];

  function openSettingsModal() {
    showSettingsModal = true;
  }

  function closeSettingsModal() {
    showSettingsModal = false;
  }

  async function saveSettings() {
    isSavingSettings = true;
    try {
      const response = await fetch(`/api/games/${game.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameSettings)
      });

      if (response.ok) {
        closeSettingsModal();
        await invalidateAll();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("An error occurred while updating settings");
    } finally {
      isSavingSettings = false;
    }
  }

  // Join game
  let isJoining = false;
  let joinError = "";

  async function joinGame() {
    isJoining = true;
    joinError = "";

    try {
      const response = await fetch(`/api/games/${game.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        joinError = error.error || "Failed to join game";
      }
    } catch (error) {
      console.error("Error joining game:", error);
      joinError = "An error occurred while joining the game";
    } finally {
      isJoining = false;
    }
  }

  // Leave game
  let isLeaving = false;
  let leaveError = "";

  async function leaveGame() {
    if (!confirm("Are you sure you want to leave this game?")) {
      return;
    }

    isLeaving = true;
    leaveError = "";

    try {
      const response = await fetch(`/api/games/${game.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        // Redirect to home page after leaving
        goto("/");
      } else {
        const error = await response.json();
        leaveError = error.error || "Failed to leave game";
      }
    } catch (error) {
      console.error("Error leaving game:", error);
      leaveError = "An error occurred while leaving the game";
    } finally {
      isLeaving = false;
    }
  }

  // Eject player (creator only)
  let ejectingPlayerId: string | null = null;

  async function ejectPlayer(userId: string, playerName: string) {
    if (!confirm(`Are you sure you want to eject ${playerName} from the game?`)) {
      return;
    }

    ejectingPlayerId = userId;

    try {
      const response = await fetch(`/api/games/${game.id}/eject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to eject player");
      }
    } catch (error) {
      console.error("Error ejecting player:", error);
      alert("An error occurred while ejecting the player");
    } finally {
      ejectingPlayerId = null;
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
          <div class="card-header">
            <h2>Game Information</h2>
            {#if isCreator && (game.status === 'awaitingPlayers' || game.status === 'readyToStart')}
              <button class="settings-btn" on:click={openSettingsModal} title="Game Settings">
                ⚙️
              </button>
            {/if}
          </div>
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
              <span class="value">{isCreator ? "Game Creator" : "Player"}</span>
            </div>
            <div class="info-item">
              <span class="label">Visibility:</span>
              <span class="value">{game?.isPrivate ? "Private" : "Public"}</span>
            </div>
            <div class="info-item">
              <span class="label">Time Per Move:</span>
              <span class="value">{game?.timeLimitPerMove ? `${game.timeLimitPerMove}s` : "No limit"}</span>
            </div>
            <div class="info-item">
              <span class="label">Rated:</span>
              <span class="value">{game?.isRated ? "Yes" : "No"}</span>
            </div>
            <div class="info-item">
              <span class="label">Team Assignment:</span>
              <span class="value">{game?.teamAssignment === 'manual' ? 'Manual' : 'Random'}</span>
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
                placeholder="Invite players"
                class="invite-input"
                bind:value={searchQuery}
                on:input={handleSearchInput}
                on:focus={handleSearchFocus}
                on:blur={handleSearchBlur}
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
                        Recent players will appear here
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
                              {user.name?.charAt(0) || "?"}
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
                <div class="player-name">{isCreator ? "You" : "Player 1"}</div>
                <div class="player-status">Creator</div>
              </div>
            </div>

            <!-- Invited player slots -->
            {#each invitations as invitation}
              <div
                class="player-slot {invitation.status === 'accepted'
                  ? 'filled'
                  : 'pending'}"
              >
                {#if invitation.invitedUser.image}
                  <img
                    src={invitation.invitedUser.image}
                    alt={invitation.invitedUser.name}
                    class="player-avatar"
                  />
                {:else}
                  <div class="player-icon">
                    {invitation.invitedUser.name?.charAt(0) || "?"}
                  </div>
                {/if}
                <div class="player-info">
                  <div class="player-name">
                    {invitation.invitedUserId === user?.id
                      ? "You"
                      : invitation.invitedUser.name}
                  </div>
                  <div class="player-status">
                    {invitation.status === "accepted"
                      ? "Accepted"
                      : "Invited (Pending)"}
                  </div>
                </div>
                {#if isCreator && game.status !== "inProgress" && game.status !== "complete"}
                  <button
                    class="eject-btn"
                    on:click={() => ejectPlayer(invitation.invitedUserId, invitation.invitedUser.name)}
                    disabled={ejectingPlayerId === invitation.invitedUserId}
                    title="Eject player"
                  >
                    {ejectingPlayerId === invitation.invitedUserId ? "..." : "✕"}
                  </button>
                {/if}
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
            {#if game.status === "readyToStart"}
              <button class="btn-primary" on:click={startGame}>
                Start Game
              </button>
              <p class="help-text">All players are ready! Click to begin.</p>
            {:else}
              <button class="btn-primary" disabled>
                Waiting for Players ({totalPlayers}/4)
              </button>
              <p class="help-text">
                You can invite as many players as you like, but only the first 3
                to accept will be able to play.
              </p>
            {/if}
          {:else if myInvitation?.status === "pending"}
            <div class="invitation-actions">
              <button
                class="btn-accept"
                on:click={() => respondToInvitation("accepted")}
                disabled={isResponding}
              >
                {isResponding ? "Responding..." : "Accept Invitation"}
              </button>
              <button
                class="btn-decline"
                on:click={() => respondToInvitation("declined")}
                disabled={isResponding}
              >
                Decline
              </button>
            </div>
            {#if respondError}
              <p class="error-text">{respondError}</p>
            {/if}
          {:else if myInvitation?.status === "accepted"}
            <div class="accepted-player-actions">
              {#if game.status === "readyToStart"}
                <button class="btn-primary" disabled>
                  Waiting for creator to start game...
                </button>
              {:else}
                <button class="btn-primary" disabled>
                  Waiting for other players...
                </button>
              {/if}
              <button
                class="btn-leave"
                on:click={leaveGame}
                disabled={isLeaving}
              >
                {isLeaving ? "Leaving..." : "Leave Game"}
              </button>
            </div>
            {#if leaveError}
              <p class="error-text">{leaveError}</p>
            {/if}
          {:else if myInvitation?.status === "declined"}
            <p class="info-text">You have declined this invitation</p>
          {:else}
            <!-- User is not invited and not creator - show join button for public games -->
            {#if !game.isPrivate && (game.status === "awaitingPlayers" || game.status === "readyToStart")}
              <button
                class="btn-primary"
                on:click={joinGame}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join Game"}
              </button>
              <p class="help-text">
                Join this public game and play with other players!
              </p>
              {#if joinError}
                <p class="error-text">{joinError}</p>
              {/if}
            {:else if game.isPrivate}
              <p class="info-text">This is a private game. You need an invitation to join.</p>
            {:else}
              <button class="btn-primary" disabled>Waiting for Players</button>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {:else if game.status === "inProgress"}
    <!-- Game Board View (placeholder) -->
    <div class="game-view">
      <h1>Chess Doubles - Game In Progress</h1>
      <p>Game board coming soon...</p>
      <button class="btn-secondary" on:click={goHome}>← Back to Home</button>
    </div>
  {:else if game.status === "complete"}
    <!-- Completed Game View (placeholder) -->
    <div class="game-view">
      <h1>Game Complete</h1>
      <p>This game has ended.</p>
      <button class="btn-secondary" on:click={goHome}>← Back to Home</button>
    </div>
  {/if}
</div>

<!-- Settings Modal -->
{#if showSettingsModal}
  <div class="modal-overlay" on:click={closeSettingsModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Game Settings</h2>
        <button class="close-btn" on:click={closeSettingsModal}>×</button>
      </div>

      <div class="modal-body">
        <div class="config-section">
          <label class="config-label">
            <input type="checkbox" bind:checked={gameSettings.isPrivate} />
            <span>Private Game</span>
          </label>
          <p class="help-text">Private games won't appear in public listings</p>
        </div>

        <div class="config-section">
          <label class="config-label-block">
            <span>Time Limit Per Move</span>
            <select bind:value={gameSettings.timeLimitPerMove}>
              {#each timeLimitOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
          <p class="help-text">Maximum time allowed for each move (currently not enforced during gameplay)</p>
        </div>

        <div class="config-section">
          <label class="config-label">
            <input type="checkbox" bind:checked={gameSettings.isRated} />
            <span>Rated Game</span>
          </label>
          <p class="help-text">Rated games will affect player rankings (currently not enforced during gameplay)</p>
        </div>

        <div class="config-section">
          <label class="config-label-block">
            <span>Team Assignment</span>
            <select bind:value={gameSettings.teamAssignment}>
              <option value="manual">Manual</option>
              <option value="random">Random</option>
            </select>
          </label>
          <p class="help-text">Manual: Players choose teams. Random: Teams assigned automatically (currently not enforced during gameplay)</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" on:click={closeSettingsModal}>
          Cancel
        </button>
        <button
          class="btn-primary-modal"
          on:click={saveSettings}
          disabled={isSavingSettings}
        >
          {isSavingSettings ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  </div>
{/if}

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
    position: relative;
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

  .eject-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: #dc3545;
    color: white;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-weight: bold;
  }

  .eject-btn:hover:not(:disabled) {
    background: #c82333;
    transform: scale(1.1);
  }

  .eject-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .invitation-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .accepted-player-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .btn-accept,
  .btn-decline {
    padding: 1rem 2rem;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
  }

  .btn-accept {
    background: #28a745;
    color: white;
  }

  .btn-accept:hover:not(:disabled) {
    background: #218838;
  }

  .btn-decline {
    background: #dc3545;
    color: white;
  }

  .btn-decline:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-accept:disabled,
  .btn-decline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-leave {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
    background: #dc3545;
    color: white;
  }

  .btn-leave:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-leave:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-text {
    color: #dc3545;
    margin-top: 0.5rem;
    font-size: 0.95rem;
  }

  .info-text {
    color: #666;
    font-size: 1rem;
    margin: 0;
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

  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e0e0e0;
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

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .card-header h2 {
    margin: 0;
  }

  .settings-btn {
    background: #f0f0f0;
    border: none;
    font-size: 1.5rem;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-btn:hover {
    background: #e0e0e0;
  }
</style>
