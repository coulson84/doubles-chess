<script lang="ts">
  import { onMount } from "svelte";
  import { Chess } from "chess.js";
  import { Chessboard, INPUT_EVENT_TYPE } from "cm-chessboard";
  import { Markers, MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";
  import "cm-chessboard/assets/chessboard.css";
  import "cm-chessboard/assets/extensions/markers/markers.css";

  export let boardId: string;
  export let boardTitle: string;
  export let fen: string;
  export let whitePlayer: { id: string; name: string };
  export let blackPlayer: { id: string; name: string };
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

  $: isMyTurn = currentUserId === currentTurnUserId;
  $: orientation = currentUserId === whitePlayer.id ? "white" : "black";

  onMount(() => {
    chess = new Chess(fen);

    board = new Chessboard(boardContainer, {
      position: fen,
      orientation: orientation,
      sprite: {
        url: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/images/chessboard-sprite-staunty.svg",
      },
      style: {
        cssClass: "chess-board default",
      },
      extensions: [
        {class: Markers, props: {autoMarkers: MARKER_TYPE.square}}
      ]
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
  <div class="board-container" bind:this={boardContainer}></div>
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

  :global(.chess-board) {
    border-radius: 8px;
    overflow: hidden;
  }
</style>
