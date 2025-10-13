<script lang="ts">
  import { onMount } from "svelte";
  import { Chess } from "chess.js";
  import { Chessboard, INPUT_EVENT_TYPE } from "cm-chessboard";
  import {
    Markers,
    MARKER_TYPE,
  } from "cm-chessboard/src/extensions/markers/Markers.js";
  import "cm-chessboard/assets/chessboard.css";
  import "cm-chessboard/assets/extensions/markers/markers.css";

  export let boardId: string;
  export let boardTitle: string;
  export let fen: string;
  export let whitePlayer: { id: string; name: string };
  export let blackPlayer: { id: string; name: string };
  export let whiteTeamMate: { id: string; name: string } | null;
  export let blackTeamMate: { id: string; name: string } | null;
  export let currentTurnUserId: string;
  export let currentUserId: string;
  export let onMove: (
    from: string,
    to: string,
    promotion?: string
  ) => Promise<void>;
  export let onPiecePlacement: (piece: string, square: string) => Promise<void>;
  export let teammateCapturedPieces: string[];

  let boardContainer: HTMLDivElement;
  let board: Chessboard;
  let chess: Chess;
  let capturedPieces: { white: string[]; black: string[] } = {
    white: [],
    black: [],
  };
  let placementMode = false;
  let selectedPieceForPlacement: string | null = null;

  $: isMyTurn = currentUserId === currentTurnUserId;

  // Calculate captured pieces from the current position
  function calculateCapturedPieces(fen: string) {
    // Starting material count
    const startingMaterial: { [key: string]: number } = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1,
      P: 8,
      N: 2,
      B: 2,
      R: 2,
      Q: 1,
      K: 1,
    };

    // Count current pieces on board
    const currentMaterial: { [key: string]: number } = {};
    const position = fen.split(" ")[0]; // Get position part of FEN

    for (const char of position) {
      if (char !== "/" && isNaN(parseInt(char))) {
        currentMaterial[char] = (currentMaterial[char] || 0) + 1;
      }
    }

    // Calculate captured pieces
    const captured = { white: [] as string[], black: [] as string[] };

    for (const [piece, startCount] of Object.entries(startingMaterial)) {
      const currentCount = currentMaterial[piece] || 0;
      const capturedCount = startCount - currentCount;

      if (capturedCount > 0) {
        // Lowercase = black piece, captured by white
        // Uppercase = white piece, captured by black
        const isBlackPiece = piece === piece.toLowerCase();
        const capturedBy = isBlackPiece ? "white" : "black";

        for (let i = 0; i < capturedCount; i++) {
          captured[capturedBy].push(piece.toLowerCase());
        }
      }
    }

    return captured;
  }

  // Update captured pieces when FEN changes
  $: if (fen) {
    capturedPieces = calculateCapturedPieces(fen);
  }

  // Convert piece letter to unicode symbol
  function getPieceSymbol(piece: string): string {
    const symbols: { [key: string]: string } = {
      k: "♔",
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
      p: "♙",
    };
    return symbols[piece.toLowerCase()] || piece;
  }

  // Check if a square is valid for piece placement
  function isValidPlacementSquare(square: string, piece: string): boolean {
    const row = parseInt(square[1]);
    const isWhite = currentUserId === whitePlayer.id;

    // Determine valid rows based on player color
    const validRows = isWhite
      ? piece === "p"
        ? [1, 2]
        : [1] // White: row 1 and 2 for pawns, row 1 for others
      : piece === "p"
        ? [7, 8]
        : [8]; // Black: row 7 and 8 for pawns, row 8 for others

    // Check if the square is empty
    const boardSquare = chess.get(square as any);
    if (boardSquare != null) {
      return false;
    }

    return validRows.includes(row);
  }

  // Handle clicking on a captured piece to enter placement mode
  function selectPieceForPlacement(piece: string) {
    console.log("selectPieceForPlacement", piece);
    if (!isMyTurn) return;

    selectedPieceForPlacement = piece;
    placementMode = true;

    // Show markers on valid placement squares
    board.removeMarkers();
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const isWhite = currentUserId === whitePlayer.id;
    const rows =
      piece === "p" ? (isWhite ? [1, 2] : [7, 8]) : isWhite ? [1] : [8];

    for (const file of files) {
      for (const row of rows) {
        const square = `${file}${row}`;
        if (isValidPlacementSquare(square, piece)) {
          board.addMarker(MARKER_TYPE.dot, square);
        }
      }
    }
  }

  // Cancel placement mode
  function cancelPlacement() {
    placementMode = false;
    selectedPieceForPlacement = null;
    board.removeMarkers();
  }

  // Handle square click for piece placement
  async function handleSquareClick(square: string) {
    console.log("handleSquareClick called", {
      square,
      placementMode,
      selectedPieceForPlacement,
      isValid: isValidPlacementSquare(square, selectedPieceForPlacement || ''),
    });

    if (!placementMode || !selectedPieceForPlacement) {
      console.log("Exiting: not in placement mode or no piece selected");
      return;
    }

    if (isValidPlacementSquare(square, selectedPieceForPlacement)) {
      console.log("Placing piece...");
      try {
        await onPiecePlacement(selectedPieceForPlacement, square);
        cancelPlacement();
      } catch (error) {
        console.error("Failed to place piece:", error);
        cancelPlacement();
      }
    } else {
      console.log("Square is not valid for placement");
    }
  }

  // Handle clicks on the board for piece placement
  function handleBoardClick(event: MouseEvent) {
    console.log("Board clicked", { placementMode, selectedPieceForPlacement });
    if (!placementMode || !selectedPieceForPlacement || !board) {
      console.log("Not handling click - mode check failed");
      return;
    }

    // Try to find the square from various possible elements
    const target = event.target as HTMLElement;
    console.log("Click target:", target, "classes:", target.className);

    // Check if we clicked on a square element (cm-chessboard uses data-square attribute)
    let squareElement = target.closest('.square') as HTMLElement;
    if (!squareElement) {
      squareElement = target.classList?.contains('square') ? target : null;
    }

    console.log("Square element found:", squareElement);

    if (squareElement) {
      // Get the square name from the data-square attribute or class
      const dataSquare = squareElement.getAttribute('data-square');
      console.log("data-square attribute:", dataSquare);
      if (dataSquare) {
        handleSquareClick(dataSquare);
        return;
      }

      // Try to parse from class names (e.g., "square e2")
      const classes = squareElement.className.split(' ');
      console.log("Classes:", classes);
      const squareClass = classes.find(c => /^[a-h][1-8]$/.test(c));
      console.log("Found square class:", squareClass);
      if (squareClass) {
        handleSquareClick(squareClass);
      }
    } else {
      console.log("No square element found");
    }
  }

  onMount(() => {
    chess = new Chess(fen);

    console.log(currentUserId, whitePlayer.id, {
      orientation:
        currentUserId === whitePlayer.id || currentUserId === whiteTeamMate.id
          ? "white"
          : "black",
    });
    board = new Chessboard(boardContainer, {
      position: fen,
      orientation:
        currentUserId === whitePlayer.id || currentUserId === whiteTeamMate.id
          ? "white"
          : "black",
      sprite: {
        url: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/images/chessboard-sprite-staunty.svg",
      },
      style: {
        cssClass: "chess-board default",
      },
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE.square } },
      ],
    });

    // Add click listener to the board container for placement mode
    boardContainer.addEventListener('click', handleBoardClick);

    // Handle input events (when user tries to move)
    board.enableMoveInput((event: any) => {
      console.log(event);
      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
          // If in placement mode, handle square click
          if (placementMode) {
            handleSquareClick(event.square);
            return false; // Cancel normal move
          }

          // Check if it's the player's turn
          if (!isMyTurn) {
            return false; // Cancel move
          }

          // Get valid moves for this piece
          const moves = chess.moves({ square: event.square, verbose: true });

          // Show possible move markers
          moves.forEach((move: any) => {
            board.addMarker(MARKER_TYPE.dot, move.to);
          });

          return true;

        case INPUT_EVENT_TYPE.validateMoveInput:
          // Check if the move is legal
          try {
            const move = chess.move({
              from: event.squareFrom,
              to: event.squareTo,
              promotion: "q", // Always promote to queen for now
            });
            chess.undo(); // Undo temporarily
            return true;
          } catch (e) {
            chess.undo(); // Undo temporarily
            return false;
          }

        case INPUT_EVENT_TYPE.moveInputCanceled:
          // Remove markers
          board.removeMarkers(MARKER_TYPE.dot);
          break;

        case INPUT_EVENT_TYPE.moveInputFinished:
          // Remove markers
          board.removeMarkers(MARKER_TYPE.dot);

          if (event.squareTo === null) {
            return false;
          }
          // Make the move locally first for optimistic UI
          const localMove = chess.move({
            from: event.squareFrom,
            to: event.squareTo,
            promotion: "q", // Always promote to queen for now
          });

          if (localMove) {
            // Update the board position optimistically
            board.setPosition(chess.fen());

            // Make the move on the server
            onMove(event.squareFrom, event.squareTo).catch(() => {
              // If the server rejects the move, revert it
              chess.undo();
              board.setPosition(chess.fen());
            });
          }
          break;
      }
      return true;
    });

    return () => {
      boardContainer.removeEventListener('click', handleBoardClick);
      board.destroy();
    };
  });

  // Update board when FEN changes
  $: if (board && fen) {
    chess = new Chess(fen);
    board.setPosition(fen);
  }
</script>

<div class="chess-board-wrapper">
  <div class="board-header">
    <div class="board-title">{boardTitle}</div>
    <div class="players">
      <div class="player white-player">
        <span class="player-icon">⚪</span>
        <span class="player-name">{whitePlayer.name}</span>
      </div>
      <div class="vs">VS</div>
      <div class="player black-player">
        <span class="player-icon">⚫</span>
        <span class="player-name">{blackPlayer.name}</span>
      </div>
    </div>
    {#if isMyTurn}
      <div class="turn-indicator your-turn">Your turn!</div>
    {:else}
      <div class="turn-indicator">Waiting for opponent...</div>
    {/if}
  </div>

  <!-- Teammate's captured pieces (available for placement) -->
  {#if teammateCapturedPieces.length > 0}
    <div class="teammate-captured-pieces">
      <div class="section-title">
        Teammate's Pieces (Click to place)
        {#if placementMode}
          <button class="cancel-btn" on:click={cancelPlacement}>Cancel</button>
        {/if}
      </div>
      <div class="pieces-container">
        {#each teammateCapturedPieces as piece}
          <button
            class="captured-piece clickable {selectedPieceForPlacement === piece
              ? 'selected'
              : ''}"
            on:click={() => selectPieceForPlacement(piece)}
            disabled={!isMyTurn}
            title="Click to place on board"
          >
            {getPieceSymbol(piece)}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Captured pieces by black (shown at top when white is at bottom) -->
  <div class="captured-pieces top">
    {#each capturedPieces.black as piece}
      <span class="captured-piece white-piece">{getPieceSymbol(piece)}</span>
    {/each}
  </div>

  <div class="board-container" bind:this={boardContainer}></div>

  <!-- Captured pieces by white (shown at bottom when white is at bottom) -->
  <div class="captured-pieces bottom">
    {#each capturedPieces.white as piece}
      <span class="captured-piece black-piece">{getPieceSymbol(piece)}</span>
    {/each}
  </div>
</div>

<style>
  .chess-board-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .board-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .board-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #fff;
    text-align: center;
  }

  .players {
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .white-player {
    color: #f7fafc;
  }

  .black-player {
    color: #cbd5e0;
  }

  .player-icon {
    font-size: 1.25rem;
  }

  .vs {
    color: #718096;
    font-weight: bold;
    font-size: 0.875rem;
  }

  .turn-indicator {
    text-align: center;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: #a0aec0;
    font-size: 0.875rem;
  }

  .turn-indicator.your-turn {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .board-container {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .captured-pieces {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.5rem;
    min-height: 2.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    align-items: center;
  }

  .captured-pieces.top {
    margin-bottom: 0.5rem;
  }

  .captured-pieces.bottom {
    margin-top: 0.5rem;
  }

  .captured-piece {
    font-size: 1.5rem;
    line-height: 1;
    transition: transform 0.2s;
  }

  .captured-piece.white-piece {
    color: #f0f0f0;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
  }

  .captured-piece.black-piece {
    color: #333;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
  }

  .teammate-captured-pieces {
    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
    border: 2px solid #48bb78;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .section-title {
    color: #48bb78;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pieces-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .captured-piece.clickable {
    background: rgba(72, 187, 120, 0.2);
    border: 2px solid #48bb78;
    border-radius: 6px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #fff;
    font-size: 1.5rem;
  }

  .captured-piece.clickable:hover:not(:disabled) {
    background: rgba(72, 187, 120, 0.4);
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(72, 187, 120, 0.6);
  }

  .captured-piece.clickable:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .captured-piece.clickable.selected {
    background: rgba(72, 187, 120, 0.6);
    border-color: #38a169;
    box-shadow: 0 0 15px rgba(72, 187, 120, 0.8);
    transform: scale(1.15);
  }

  .cancel-btn {
    background: #fc8181;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .cancel-btn:hover {
    background: #f56565;
  }

  :global(.chess-board) {
    border-radius: 8px;
    overflow: hidden;
  }
</style>
