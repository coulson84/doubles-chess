import type { WebSocketMessage } from '../../shared/types.ts';

interface WindowExtended extends Window {
    connectWebSocket: () => void;
    sendMessage: () => void;
    testAPI: () => Promise<void>;
}

declare const window: WindowExtended;

let ws: WebSocket | null = null;

function updateStatus(connected: boolean): void {
    const status = document.getElementById('status');
    if (!status) return;

    const span = status.querySelector('span');
    if (!span) return;

    if (connected) {
        span.textContent = 'Connected';
        status.className = 'p-4 rounded-lg mb-4 transition-colors duration-200 bg-green-100 text-green-800';
    } else {
        span.textContent = 'Disconnected';
        status.className = 'p-4 rounded-lg mb-4 transition-colors duration-200 bg-red-100 text-red-800';
    }
}

function addMessage(message: any): void {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'p-3 mb-2 border-l-4 border-blue-400 bg-gray-50 rounded-r-lg';
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

// Auto-connect on load
connectWebSocket();