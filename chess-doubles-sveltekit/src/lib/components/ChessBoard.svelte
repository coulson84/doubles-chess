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

  let boardContainer: HTMLDivElement;
  let board: Chessboard;
  let chess: Chess;
  let capturedPieces: { white: string[]; black: string[] } = {
    white: [],
    black: [],
  };

  $: isMyTurn = currentUserId === currentTurnUserId;

  // Calculate captured pieces from the current position
  function calculateCapturedPieces(fen: string) {
    // Starting material count
    const startingMaterial: { [key: string]: number } = {
      p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
      P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1,
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

    // Handle input events (when user tries to move)
    board.enableMoveInput((event: any) => {
      console.log(event);
      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
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
          const move = chess.move({
            from: event.squareFrom,
            to: event.squareTo,
            promotion: "q", // Always promote to queen for now
          });

          if (move) {
            chess.undo(); // Undo temporarily
            return true;
          }
          return false;

        case INPUT_EVENT_TYPE.moveInputCanceled:
          // Remove markers
          board.removeMarkers(MARKER_TYPE.dot);
          break;

        case INPUT_EVENT_TYPE.moveInputFinished:
          // Remove markers
          board.removeMarkers(MARKER_TYPE.dot);

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

  :global(.chess-board) {
    border-radius: 8px;
    overflow: hidden;
  }
</style>
