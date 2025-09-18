import type { WebSocketMessage } from '../../shared/types.ts';

interface WindowExtended extends Window {
    connectWebSocket: () => void;
    sendMessage: () => void;
    testAPI: () => Promise<void>;
}

declare const window: WindowExtended;

// Chess piece symbols (Unicode)
const CHESS_PIECES = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Initial chess board setup
const INITIAL_BOARD = [
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
    ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
];

let ws: WebSocket | null = null;

function createChessBoard(boardId: string): void {
    const board = document.getElementById(boardId);
    if (!board) return;

    board.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;

            square.className = `
                w-12 h-12 flex items-center justify-center text-2xl cursor-pointer
                transition-all duration-200 hover:scale-105
                ${isLight ? 'bg-amber-200 hover:bg-amber-300' : 'bg-amber-600 hover:bg-amber-700'}
            `;

            // Add chess piece
            const piece = INITIAL_BOARD[row][col];
            if (piece) {
                const color = row < 2 ? 'black' : 'white';
                const pieceSymbol = CHESS_PIECES[color][piece as keyof typeof CHESS_PIECES.white];
                square.textContent = pieceSymbol;
                square.classList.add('text-shadow');
            }

            // Add coordinate data
            square.dataset.row = row.toString();
            square.dataset.col = col.toString();
            square.dataset.square = String.fromCharCode(97 + col) + (8 - row);

            // Add click handler
            square.addEventListener('click', () => handleSquareClick(boardId, row, col));

            board.appendChild(square);
        }
    }
}

function handleSquareClick(boardId: string, row: number, col: number): void {
    const square = String.fromCharCode(97 + col) + (8 - row);
    console.log(`Clicked ${boardId} square ${square} (${row}, ${col})`);

    // Add visual feedback
    const squareElement = document.querySelector(`#${boardId} [data-row="${row}"][data-col="${col}"]`) as HTMLElement;
    if (squareElement) {
        squareElement.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-75');
        setTimeout(() => {
            squareElement.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-75');
        }, 1000);
    }
}

function updateStatus(connected: boolean): void {
    const status = document.getElementById('status');
    if (!status) return;

    const span = status.querySelector('span');
    if (!span) return;

    if (connected) {
        span.textContent = 'Connected';
        status.className = 'inline-block p-3 rounded-lg transition-colors duration-200 bg-green-600 text-white';
    } else {
        span.textContent = 'Disconnected';
        status.className = 'inline-block p-3 rounded-lg transition-colors duration-200 bg-red-600 text-white';
    }
}

function addMessage(message: any): void {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'p-2 mb-2 border-l-4 border-amber-400 bg-slate-600 rounded-r text-sm';
    messageDiv.textContent = `[${new Date().toLocaleTimeString()}] ${JSON.stringify(message)}`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function connectWebSocket(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Already connected');
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateStatus(true);
    };

    ws.onmessage = (event: MessageEvent) => {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('Received:', data);
        addMessage(data);
    };

    ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        addMessage({ type: 'error', message: 'WebSocket error occurred' });
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus(false);
        ws = null;
    };
}

function sendMessage(): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to WebSocket');
        return;
    }

    const message: WebSocketMessage = {
        type: 'move',
        data: 'Hello from client',
        timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(message));
    addMessage({ sent: message });
}

async function testAPI(): Promise<void> {
    try {
        const response = await fetch('/api/test');
        const data = await response.json();
        addMessage({ api_response: data });
    } catch (error) {
        addMessage({ api_error: (error as Error).message });
    }
}

// Expose functions to global scope
window.connectWebSocket = connectWebSocket;
window.sendMessage = sendMessage;
window.testAPI = testAPI;

// Initialize chess boards and auto-connect on load
function initializeApp(): void {
    createChessBoard('board1');
    createChessBoard('board2');
    connectWebSocket();
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}