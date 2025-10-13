import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '$lib/db.server';
import { Chess } from 'chess.js';
import { sendToUser } from '$lib/websocket/server';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	const { gameId, boardId } = params;

	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { piece, square } = await request.json();

		if (!piece || !square) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Get the board
		const board = await knex('game_boards')
			.where({ id: boardId, gameId })
			.first();

		if (!board) {
			return json({ error: 'Board not found' }, { status: 404 });
		}

		// Verify it's the player's turn
		if (board.currentTurnUserId !== session.user.id) {
			return json({ error: 'Not your turn' }, { status: 403 });
		}

		// Verify the player is on this board
		if (board.whitePlayerId !== session.user.id && board.blackPlayerId !== session.user.id) {
			return json({ error: 'You are not playing on this board' }, { status: 403 });
		}

		// Determine player's color
		const isWhite = board.whitePlayerId === session.user.id;
		const playerColor = isWhite ? 'white' : 'black';

		// Validate square format
		if (!/^[a-h][1-8]$/.test(square)) {
			return json({ error: 'Invalid square format' }, { status: 400 });
		}

		// Validate piece type
		if (!/^[pnbrqk]$/.test(piece.toLowerCase())) {
			return json({ error: 'Invalid piece type' }, { status: 400 });
		}

		// No kings allowed for placement
		if (piece.toLowerCase() === 'k') {
			return json({ error: 'Cannot place kings' }, { status: 400 });
		}

		// Validate placement row based on piece type and player color
		const row = parseInt(square[1]);
		const validRows = isWhite
			? (piece === 'p' ? [1, 2] : [1])
			: (piece === 'p' ? [7, 8] : [8]);

		if (!validRows.includes(row)) {
			return json({
				error: `Pawns can only be placed on rows ${validRows.join(' or ')} for your color. Other pieces can only be placed on row ${validRows[0]}.`
			}, { status: 400 });
		}

		// Load the chess position
		const chess = new Chess(board.fen);

		// Check if the square is empty
		const squareContent = chess.get(square as any);
		if (squareContent != null) {
			return json({ error: 'Square is not empty' }, { status: 400 });
		}

		// Get the other board to check captured pieces
		const allBoards = await knex('game_boards')
			.where({ gameId })
			.select('id', 'fen');

		const otherBoard = allBoards.find(b => b.id !== boardId);
		if (!otherBoard) {
			return json({ error: 'No teammate board found' }, { status: 400 });
		}

		// Calculate captured pieces from teammate's board
		const startingMaterial: { [key: string]: number } = {
			p: 8, n: 2, b: 2, r: 2, q: 1,
			P: 8, N: 2, B: 2, R: 2, Q: 1,
		};

		const currentMaterial: { [key: string]: number } = {};
		const position = otherBoard.fen.split(' ')[0];

		for (const char of position) {
			if (char !== '/' && isNaN(parseInt(char))) {
				currentMaterial[char] = (currentMaterial[char] || 0) + 1;
			}
		}

		const availablePieces: string[] = [];
		for (const [p, startCount] of Object.entries(startingMaterial)) {
			const currentCount = currentMaterial[p] || 0;
			const capturedCount = startCount - currentCount;

			if (capturedCount > 0) {
				const isBlackPiece = p === p.toLowerCase();
				const capturedBy = isBlackPiece ? 'white' : 'black';

				if (capturedBy === playerColor) {
					for (let i = 0; i < capturedCount; i++) {
						availablePieces.push(p.toLowerCase());
					}
				}
			}
		}

		// Check if the piece is available
		const pieceIndex = availablePieces.indexOf(piece.toLowerCase());
		if (pieceIndex === -1) {
			return json({ error: 'Piece not available for placement' }, { status: 400 });
		}

		// Place the piece in the FEN
		const pieceLetter = isWhite ? piece.toUpperCase() : piece.toLowerCase();
		const success = chess.put({ type: piece as any, color: playerColor[0] as any }, square as any);

		if (!success) {
			return json({ error: 'Failed to place piece on board' }, { status: 400 });
		}

		// Determine next player
		const nextPlayerId = board.currentTurnUserId === board.whitePlayerId
			? board.blackPlayerId
			: board.whitePlayerId;

		// Update the board state
		await knex('game_boards')
			.where({ id: boardId })
			.update({
				fen: chess.fen(),
				currentTurnUserId: nextPlayerId,
				lastMoveAt: knex.fn.now(),
				updatedAt: knex.fn.now()
			});

		// Send WebSocket notification to opponent
		sendToUser(nextPlayerId, {
			type: 'piece_placed',
			payload: {
				gameId,
				boardId,
				piece,
				square,
				fen: chess.fen()
			}
		});

		return json({ success: true, fen: chess.fen() }, { status: 200 });
	} catch (error) {
		console.error('Error placing piece:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to place piece';
		return json({ error: errorMessage }, { status: 500 });
	}
};
