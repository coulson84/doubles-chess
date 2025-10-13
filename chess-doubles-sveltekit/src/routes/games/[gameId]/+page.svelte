<script lang="ts">
  import type { PageData } from "./$types";
  import { goto, invalidateAll } from "$app/navigation";
  import { wsClient } from "$lib/websocket/client";
  import { onMount, onDestroy } from "svelte";
  import type { GameInviteResponsePayload } from "$lib/websocket/types";
  import ChessBoard from "$lib/components/ChessBoard.svelte";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
  $: game = data.game;
  $: invitations = data.invitations || [];
  $: myInvitation = data.myInvitation;
  $: gamePlayers = data.gamePlayers || [];
  $: gameBoards = data.gameBoards || [];
  $: totalPlayers = gamePlayers.length;
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

      // Handle chess moves
      const unsubChessMove = wsClient.on("chess_move", async (payload: any) => {
        if (payload.gameId === game.id) {
          console.log("Opponent made a move:", payload.move);
          await invalidateAll();
        }
      });

      // Handle game started
      const unsubGameStarted = wsClient.on(
        "game_started",
        async (payload: any) => {
          if (payload.gameId === game.id) {
            console.log("Game has started!");
            await invalidateAll();
          }
        }
      );

      return () => {
        unsubAccepted();
        unsubDeclined();
        unsubEjected();
        unsubChessMove();
        unsubGameStarted();
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
    teamAssignment: "manual" as "manual" | "random",
  } as Pick<
    typeof game,
    "isPrivate" | "timeLimitPerMove" | "isRated" | "teamAssignment"
  >;

  $: if (game) {
    // Update settings when game changes
    gameSettings = {
      isPrivate: game.isPrivate ?? false,
      timeLimitPerMove: game.timeLimitPerMove ?? null,
      isRated: game.isRated ?? false,
      teamAssignment: game.teamAssignment ?? "manual",
    };
  }

  const timeLimitOptions = [
    { label: "No limit", value: null },
    { label: "1 minute", value: 60 },
    { label: "10 minutes", value: 600 },
    { label: "1 hour", value: 3600 },
    { label: "12 hours", value: 43200 },
    { label: "1 day", value: 86400 },
    { label: "3 days", value: 259200 },
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
        body: JSON.stringify(gameSettings),
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    if (
      !confirm(`Are you sure you want to eject ${playerName} from the game?`)
    ) {
      return;
    }

    ejectingPlayerId = userId;

    try {
      const response = await fetch(`/api/games/${game.id}/eject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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

  // Get teammate's captured pieces for the current user's board
  function getTeammateCapturedPieces(board: any): string[] {
    if (!user?.id) return [];

    // Find the other board (teammate's board)
    const otherBoard = gameBoards.find((b) => b.id !== board.id);
    if (!otherBoard) return [];

    // Determine which team the current user is on
    const userTeam = board.whitePlayerId === user.id ? "white" : "black";

    // Calculate captured pieces from the other board
    const startingMaterial: { [key: string]: number } = {
      p: 8, n: 2, b: 2, r: 2, q: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1,
    };

    const currentMaterial: { [key: string]: number } = {};
    const position = otherBoard.fen.split(" ")[0];

    for (const char of position) {
      if (char !== "/" && isNaN(parseInt(char))) {
        currentMaterial[char] = (currentMaterial[char] || 0) + 1;
      }
    }

    const capturedByTeammate: string[] = [];
    for (const [piece, startCount] of Object.entries(startingMaterial)) {
      const currentCount = currentMaterial[piece] || 0;
      const capturedCount = startCount - currentCount;

      if (capturedCount > 0) {
        const isBlackPiece = piece === piece.toLowerCase();
        const capturedBy = isBlackPiece ? "white" : "black";

        // Only include pieces captured by teammate's side (same team)
        if (capturedBy === userTeam) {
          for (let i = 0; i < capturedCount; i++) {
            capturedByTeammate.push(piece.toLowerCase());
          }
        }
      }
    }

    return capturedByTeammate;
  }

  // Handle piece placement
  async function handlePiecePlacement(
    boardId: string,
    piece: string,
    square: string
  ) {
    try {
      const response = await fetch(
        `/api/games/${game.id}/boards/${boardId}/place-piece`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ piece, square }),
        }
      );

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        alert(error.error || "Invalid piece placement");
        throw new Error(error.error || "Placement rejected");
      }
    } catch (error) {
      console.error("Error placing piece:", error);
      if (error instanceof Error && error.message !== "Placement rejected") {
        alert("An error occurred while placing the piece");
      }
      throw error;
    }
  }

  // Handle chess moves
  async function handleMove(
    boardId: string,
    from: string,
    to: string,
    promotion?: string
  ) {
    try {
      const response = await fetch(
        `/api/games/${game.id}/boards/${boardId}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, promotion: promotion || "q" }),
        }
      );

      if (response.ok) {
        await invalidateAll();
      } else {
        const error = await response.json();
        if (error.waitingForOtherBoard) {
          // Show a more friendly message for the waiting state
          alert(
            `⏳ ${error.error}\n\nThis prevents one board from getting too far ahead.`
          );
          throw new Error("Move rejected");
        } else {
          alert(error.error || "Invalid move");
          throw new Error(error.error || "Move rejected");
        }
      }
    } catch (error) {
      console.error("Error making move:", error);
      if (error instanceof Error && error.message !== "Move rejected") {
        alert("An error occurred while making the move");
      }
      // Re-throw to trigger the catch handler in ChessBoard component
      throw error;
    }
  }

  // Drag and drop state
  let draggedUserId: string | null = null;
  let draggedElement: HTMLElement | null = null;
  let dragClone: HTMLElement | null = null;
  let isDragging = false;

  function handlePointerDown(event: PointerEvent, userId: string) {
    if (
      !isCreator ||
      game.status === "inProgress" ||
      game.status === "complete"
    ) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const card = target.closest(".player-slot") as HTMLElement;

    if (!card) return;

    draggedUserId = userId;
    draggedElement = card;
    isDragging = true;

    // Add placeholder class to original (reduces opacity)
    card.classList.add("drag-placeholder");

    // Create a clone that will follow the pointer
    dragClone = card.cloneNode(true) as HTMLElement;
    dragClone.classList.add("drag-clone");
    dragClone.classList.remove("drag-placeholder");
    document.body.appendChild(dragClone);

    // Position the clone at the card's current position
    const rect = card.getBoundingClientRect();
    dragClone.style.position = "fixed";
    dragClone.style.width = `${rect.width}px`;
    dragClone.style.left = `${rect.left}px`;
    dragClone.style.top = `${rect.top}px`;
    dragClone.style.zIndex = "1000";
    dragClone.style.pointerEvents = "none";

    // Set pointer capture to continue tracking even if pointer leaves element
    target.setPointerCapture(event.pointerId);

    // Prevent text selection
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDragging || !dragClone) return;

    // Move the clone with the pointer
    dragClone.style.left = `${event.clientX - dragClone.offsetWidth / 2}px`;
    dragClone.style.top = `${event.clientY - dragClone.offsetHeight / 2}px`;
  }

  async function handlePointerUp(event: PointerEvent) {
    if (!isDragging || !draggedUserId || !draggedElement || !dragClone) return;

    const card = draggedElement;

    // Find the element under the pointer
    const elementBelow = document.elementFromPoint(
      event.clientX,
      event.clientY
    );

    // Remove the clone
    dragClone.remove();
    dragClone = null;

    // Remove placeholder class from original
    card.classList.remove("drag-placeholder");

    // Find if we dropped on a position slot
    const targetSlot = elementBelow?.closest(".position-slot") as HTMLElement;

    if (targetSlot) {
      const targetTeam = targetSlot.dataset.team;
      const targetPosition = parseInt(targetSlot.dataset.position || "0");

      if (targetTeam && targetPosition) {
        try {
          const response = await fetch(`/api/games/${game.id}/change-team`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draggedUserId,
              targetTeam,
              targetPosition,
            }),
          });

          if (response.ok) {
            await invalidateAll();
          } else {
            const error = await response.json();
            alert(error.error || "Failed to change team");
          }
        } catch (error) {
          console.error("Error changing team:", error);
          alert("An error occurred while changing team");
        }
      }
    }

    // Reset state
    draggedUserId = null;
    draggedElement = null;
    isDragging = false;
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
          {#if false}
            <div
              class="player-slot drag-clone drag-placeholder"
              style="display: none;"
            ></div>
          {/if}
          <div class="teams-container">
            <!-- White Team -->
            <div class="team-section white-team">
              <h3 class="team-title">⚪ White Team</h3>
              <div class="team-players">
                {#each [1, 2] as position}
                  {@const player = gamePlayers.find(
                    (p) => p.team === "white" && p.playerPosition === position
                  )}
                  <div
                    class="position-slot {player
                      ? 'filled'
                      : 'empty'} team-white"
                    data-team="white"
                    data-position={position}
                  >
                    <div class="position-label">Player {position}</div>
                    {#if player}
                      <div
                        class="player-slot filled team-white {isCreator
                          ? 'draggable'
                          : ''}"
                        data-user-id={player.userId}
                      >
                        <div
                          class="player-main"
                          on:pointerdown={(e) =>
                            isCreator && handlePointerDown(e, player.userId)}
                          on:pointermove={handlePointerMove}
                          on:pointerup={handlePointerUp}
                          on:pointercancel={handlePointerUp}
                        >
                          {#if player.user.image}
                            <img
                              src={player.user.image}
                              alt={player.user.name}
                              class="player-avatar"
                            />
                          {:else}
                            <div class="player-icon">
                              {player.user.name?.charAt(0) || "?"}
                            </div>
                          {/if}
                          <div class="player-info">
                            <div class="player-name">
                              {player.userId === user?.id
                                ? "You"
                                : player.user.name}
                              {#if player.isCreator}
                                <span class="creator-badge">Creator</span>
                              {/if}
                            </div>
                          </div>
                        </div>
                        {#if isCreator && !player.isCreator && game.status !== "inProgress" && game.status !== "complete"}
                          <button
                            class="eject-btn"
                            on:click={() =>
                              ejectPlayer(player.userId, player.user.name)}
                            disabled={ejectingPlayerId === player.userId}
                            title="Eject player"
                          >
                            {ejectingPlayerId === player.userId ? "..." : "✕"}
                          </button>
                        {/if}
                      </div>
                    {:else}
                      <div class="player-slot empty team-white">
                        <div class="player-icon">⭕</div>
                        <div class="player-info">
                          <div class="player-name">Waiting for player...</div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <!-- VS Divider -->
            <div class="vs-divider">
              <span>VS</span>
            </div>

            <!-- Black Team -->
            <div class="team-section black-team">
              <h3 class="team-title">⚫ Black Team</h3>
              <div class="team-players">
                {#each [1, 2] as position}
                  {@const player = gamePlayers.find(
                    (p) => p.team === "black" && p.playerPosition === position
                  )}
                  <div
                    class="position-slot {player
                      ? 'filled'
                      : 'empty'} team-black"
                    data-team="black"
                    data-position={position}
                  >
                    <div class="position-label">Player {position}</div>
                    {#if player}
                      <div
                        class="player-slot filled team-black {isCreator
                          ? 'draggable'
                          : ''}"
                        data-user-id={player.userId}
                      >
                        <div
                          class="player-main"
                          on:pointerdown={(e) =>
                            isCreator && handlePointerDown(e, player.userId)}
                          on:pointermove={handlePointerMove}
                          on:pointerup={handlePointerUp}
                          on:pointercancel={handlePointerUp}
                        >
                          {#if player.user.image}
                            <img
                              src={player.user.image}
                              alt={player.user.name}
                              class="player-avatar"
                            />
                          {:else}
                            <div class="player-icon">
                              {player.user.name?.charAt(0) || "?"}
                            </div>
                          {/if}
                          <div class="player-info">
                            <div class="player-name">
                              {player.userId === user?.id
                                ? "You"
                                : player.user.name}
                              {#if player.isCreator}
                                <span class="creator-badge">Creator</span>
                              {/if}
                            </div>
                          </div>
                        </div>
                        {#if isCreator && !player.isCreator && game.status !== "inProgress" && game.status !== "complete"}
                          <button
                            class="eject-btn"
                            on:click={() =>
                              ejectPlayer(player.userId, player.user.name)}
                            disabled={ejectingPlayerId === player.userId}
                            title="Eject player"
                          >
                            {ejectingPlayerId === player.userId ? "..." : "✕"}
                          </button>
                        {/if}
                      </div>
                    {:else}
                      <div class="player-slot empty team-black">
                        <div class="player-icon">⭕</div>
                        <div class="player-info">
                          <div class="player-name">Waiting for player...</div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Unassigned Players Section -->
          {#if invitations.some((inv) => inv.status !== "declined")}
            <div class="invited-section">
              <h3 class="invited-title">Invited Players</h3>
              <div class="invited-players">
                <!-- invited players -->
                {#each invitations.filter((inv) => inv.status !== "declined") as invitation}
                  <div
                    class="player-slot {invitation.status === 'accepted'
                      ? 'filled'
                      : 'pending'}"
                  >
                    <div class="player-main">
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
                          {#if invitation.status === "accepted"}
                            <span class="team-unassigned">No team assigned</span
                            >
                          {:else}
                            Invited (Pending)
                          {/if}
                        </div>
                      </div>
                    </div>
                    {#if isCreator && game.status !== "inProgress" && game.status !== "complete"}
                      <button
                        class="eject-btn"
                        on:click={() =>
                          ejectPlayer(
                            invitation.invitedUserId,
                            invitation.invitedUser.name
                          )}
                        disabled={ejectingPlayerId === invitation.invitedUserId}
                        title="Eject player"
                      >
                        {ejectingPlayerId === invitation.invitedUserId
                          ? "..."
                          : "✕"}
                      </button>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <div class="game-info-card">
          <div class="card-header">
            <h2>Game Information</h2>
            {#if isCreator && (game.status === "awaitingPlayers" || game.status === "readyToStart")}
              <button
                class="settings-btn"
                on:click={openSettingsModal}
                title="Game Settings"
              >
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
              <span class="value">{game?.isPrivate ? "Private" : "Public"}</span
              >
            </div>
            <div class="info-item">
              <span class="label">Time Per Move:</span>
              <span class="value"
                >{game?.timeLimitPerMove
                  ? `${game.timeLimitPerMove}s`
                  : "No limit"}</span
              >
            </div>
            <div class="info-item">
              <span class="label">Rated:</span>
              <span class="value">{game?.isRated ? "Yes" : "No"}</span>
            </div>
            <div class="info-item">
              <span class="label">Team Assignment:</span>
              <span class="value"
                >{game?.teamAssignment === "manual" ? "Manual" : "Random"}</span
              >
            </div>
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
              <p class="info-text">
                This is a private game. You need an invitation to join.
              </p>
            {:else}
              <button class="btn-primary" disabled>Waiting for Players</button>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {:else if game.status === "inProgress"}
    <!-- Game Board View -->
    <div class="game-view in-progress">
      <div class="game-header">
        <h1>Chess Doubles - In Progress</h1>
        <button class="btn-secondary" on:click={goHome}>← Back to Home</button>
      </div>

      {#if gameBoards && gameBoards.length > 0}
        {@const sortedBoards = gameBoards.slice().sort((a, b) => {
          // Put the current user's board first
          const aIsUserBoard =
            a.whitePlayerId === user?.id || a.blackPlayerId === user?.id;
          const bIsUserBoard =
            b.whitePlayerId === user?.id || b.blackPlayerId === user?.id;
          if (aIsUserBoard && !bIsUserBoard) return -1;
          if (!aIsUserBoard && bIsUserBoard) return 1;
          return 0;
        })}
        <div class="boards-container">
          {#each sortedBoards as board, index}
            {@const whitePlayer = gamePlayers.find(
              (p) => p.userId === board.whitePlayerId
            )}
            {@const blackPlayer = gamePlayers.find(
              (p) => p.userId === board.blackPlayerId
            )}
            {@const isUserBoard =
              board.whitePlayerId === user?.id ||
              board.blackPlayerId === user?.id}
            {@const boardTitle = isUserBoard
              ? "Your Board"
              : "Teammate's Board"}
            {@const teammateCapturedPieces = isUserBoard ? getTeammateCapturedPieces(board) : []}
            {#if whitePlayer && blackPlayer}
              <ChessBoard
                boardId={board.id}
                {boardTitle}
                fen={board.fen}
                whitePlayer={{
                  id: whitePlayer.userId,
                  name: whitePlayer.user.name,
                }}
                blackPlayer={{
                  id: blackPlayer.userId,
                  name: blackPlayer.user.name,
                }}
                whiteTeamMate={gamePlayers.find(
                  (p) => p.team === "white" && p.userId !== whitePlayer.userId
                )?.user ?? null}
                blackTeamMate={gamePlayers.find(
                  (p) => p.team === "black" && p.userId !== blackPlayer.userId
                )?.user ?? null}
                currentTurnUserId={board.currentTurnUserId}
                currentUserId={user?.id || ""}
                {teammateCapturedPieces}
                onMove={async (from, to, promotion) =>
                  await handleMove(board.id, from, to, promotion)}
                onPiecePlacement={async (piece, square) =>
                  await handlePiecePlacement(board.id, piece, square)}
              />
            {/if}
          {/each}
        </div>
      {:else}
        <div class="no-boards">
          <p>Game boards are being set up...</p>
          <p class="error-note">
            This game was started before the chess board system was implemented.
          </p>
        </div>
      {/if}
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
          <p class="help-text">
            Maximum time allowed for each move (currently not enforced during
            gameplay)
          </p>
        </div>

        <div class="config-section">
          <label class="config-label">
            <input type="checkbox" bind:checked={gameSettings.isRated} />
            <span>Rated Game</span>
          </label>
          <p class="help-text">
            Rated games will affect player rankings (currently not enforced
            during gameplay)
          </p>
        </div>

        <div class="config-section">
          <label class="config-label-block">
            <span>Team Assignment</span>
            <select bind:value={gameSettings.teamAssignment}>
              <option value="manual">Manual</option>
              <option value="random">Random</option>
            </select>
          </label>
          <p class="help-text">
            Manual: Players choose teams. Random: Teams assigned automatically
            (currently not enforced during gameplay)
          </p>
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

  .creator-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 0.7rem;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-left: 0.5rem;
  }

  .teams-container {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 2rem;
    margin-top: 1.5rem;
    align-items: middle;
  }

  .team-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 3px solid;
  }

  .team-section.white-team {
    border-color: #666;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  }

  .team-section.black-team {
    border-color: #333;
    background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
  }

  .team-title {
    font-size: 1.3rem;
    font-weight: 700;
    text-align: center;
    margin: 0 0 1rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(0, 0, 0, 0.1);
  }

  .black-team .team-title {
    color: white;
    border-bottom-color: rgba(255, 255, 255, 0.2);
  }

  .team-players {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .vs-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 900;
    color: #667eea;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    padding: 2rem 0;
  }

  .vs-divider span {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .invited-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-radius: 12px;
  }

  .invited-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #856404;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .invited-players {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .assign-white-btn,
  .assign-black-btn {
    background: white;
    border: 2px solid;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .position-slot {
    background: #f8f9fa;
    border: 2px dashed #d0d0d0;
    border-radius: 12px;
    padding: 1rem;
    transition: all 0.3s;
    position: relative;
    min-height: 100px;
  }

  .position-slot.team-white {
    background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
    border: 2px dashed #999;
  }

  .position-slot.team-black {
    background: linear-gradient(135deg, #5a5a5a 0%, #3a3a3a 100%);
    border: 2px dashed #bbb;
  }

  .position-slot.filled {
    border-style: solid;
  }

  .position-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
    color: #666;
  }

  .position-slot.team-black .position-label {
    color: #ccc;
  }

  .player-slot {
    background: #f8f9fa;
    border: 2px dashed #d0d0d0;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    transition: all 0.3s;
    position: relative;
  }

  .player-slot.draggable {
    cursor: grab;
  }

  .player-slot.draggable:active {
    cursor: grabbing;
    transition: all 0.1s;
  }

  .player-slot.drag-placeholder {
    opacity: 0.3;
    transition: opacity 0.2s;
  }

  .player-slot.drag-clone {
    opacity: 0.9;
    transform: scale(1.05) rotate(2deg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    cursor: grabbing;
    transition: transform 0.1s ease-out;
  }

  .player-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
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

  .player-slot.team-white {
    background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
    border: 3px solid #666;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .player-slot.team-black {
    background: linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%);
    border: 3px solid #888;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: white;
  }

  .player-slot.team-black .player-name,
  .player-slot.team-black .player-status {
    color: white;
  }

  .player-slot.team-black .player-icon {
    background: #555;
    color: white;
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

  .team-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
  }
  .team-toggle-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    font-weight: 400;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    flex-shrink: 0;
  }

  .team-toggle-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    transform: scale(1.15);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .team-toggle-btn:active:not(:disabled) {
    transform: scale(1.05) rotate(180deg);
  }

  .team-toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #ccc;
    box-shadow: none;
  }

  .team-indicator {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .team-indicator.white {
    color: #333;
  }

  .team-indicator.black {
    color: inherit;
  }

  .team-unassigned {
    color: #dc3545;
    font-style: italic;
    font-size: 0.9rem;
  }

  .player-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    font-weight: 700;
    text-transform: uppercase;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  }

  .player-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
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

    .teams-container {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .vs-divider {
      transform: rotate(90deg);
      padding: 1rem 0;
    }

    .unassigned-players {
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

  /* Game Board View Styles */
  .game-view.in-progress {
    min-height: 100vh;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .game-header h1 {
    margin: 0;
  }

  .boards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 2rem;
    justify-items: center;
  }

  @media (max-width: 768px) {
    .boards-container {
      grid-template-columns: 1fr;
    }
  }

  .no-boards {
    text-align: center;
    padding: 3rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .no-boards p {
    font-size: 1.1rem;
    color: #666;
    margin: 0.5rem 0;
  }

  .error-note {
    font-size: 0.9rem !important;
    color: #999 !important;
    font-style: italic;
  }
</style>
