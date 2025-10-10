import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { WebSocketMessage } from './types';

// Use globalThis to ensure singleton across all module contexts
const GLOBAL_WS_KEY = Symbol.for('chess-doubles.websocket.server');

interface GlobalWebSocketState {
	wss: WebSocketServer | null;
	clients: Map<string, Set<WebSocket>>;
	pingInterval: ReturnType<typeof setInterval> | null;
}

function getGlobalState(): GlobalWebSocketState {
	if (!(globalThis as any)[GLOBAL_WS_KEY]) {
		console.log('[WebSocket] Creating new global state');
		(globalThis as any)[GLOBAL_WS_KEY] = {
			wss: null,
			clients: new Map<string, Set<WebSocket>>(),
			pingInterval: null
		};
	}
	return (globalThis as any)[GLOBAL_WS_KEY];
}

export function initializeWebSocketServer() {
	const state = getGlobalState();

	if (state.wss) {
		console.log('[WebSocket] Server already initialized');
		return state.wss;
	}

	console.log('[WebSocket] Initializing new WebSocket server');
	state.wss = new WebSocketServer({ noServer: true });

	state.wss.on('connection', (ws: WebSocket, request: IncomingMessage, userId: string) => {
		console.log(`[WebSocket] Client connected: ${userId}`);

		// Add client to the map
		if (!state.clients.has(userId)) {
			state.clients.set(userId, new Set());
		}
		state.clients.get(userId)!.add(ws);
		console.log(`[WebSocket] Total users connected: ${state.clients.size}`);

		// Send connection confirmation
		ws.send(JSON.stringify({ type: 'connected', payload: { userId } }));

		ws.on('close', () => {
			console.log(`[WebSocket] Client disconnected: ${userId}`);
			const userClients = state.clients.get(userId);
			if (userClients) {
				userClients.delete(ws);
				if (userClients.size === 0) {
					state.clients.delete(userId);
				}
			}
			console.log(`[WebSocket] Total users connected: ${state.clients.size}`);
		});

		ws.on('error', (error) => {
			console.error('[WebSocket] Error:', error);
		});

		// Handle ping/pong for connection health
		ws.on('pong', () => {
			// Client is alive
		});
	});

	// Set up ping interval to keep connections alive
	if (!state.pingInterval) {
		state.pingInterval = setInterval(() => {
			const clientCount = state.wss?.clients.size || 0;
			if (clientCount > 0) {
				console.log(`[WebSocket] Pinging ${clientCount} clients`);
			}
			state.wss?.clients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.ping();
				}
			});
		}, 30000); // Ping every 30 seconds
	}

	state.wss.on('close', () => {
		console.log('[WebSocket] Server closing');
		if (state.pingInterval) {
			clearInterval(state.pingInterval);
			state.pingInterval = null;
		}
	});

	return state.wss;
}

export function handleUpgrade(
	request: IncomingMessage,
	socket: Duplex,
	head: Buffer,
	userId: string
) {
	const server = initializeWebSocketServer();

	server.handleUpgrade(request, socket, head, (ws) => {
		server.emit('connection', ws, request, userId);
	});
}

export function sendToUser(userId: string, message: WebSocketMessage) {
	const state = getGlobalState();
	const userClients = state.clients.get(userId);

	if (!userClients || userClients.size === 0) {
		console.log(`[WebSocket] No connections for user ${userId}`);
		return false;
	}

	const messageStr = JSON.stringify(message);
	let sent = false;

	userClients.forEach((ws) => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(messageStr);
			sent = true;
		}
	});

	if (sent) {
		console.log(`[WebSocket] Sent message to user ${userId}: ${message.type}`);
	}

	return sent;
}

export function sendToUsers(userIds: string[], message: WebSocketMessage) {
	const results = userIds.map((userId) => sendToUser(userId, message));
	return results.some((sent) => sent);
}

export function broadcastToAll(message: WebSocketMessage) {
	const state = getGlobalState();
	const messageStr = JSON.stringify(message);
	let count = 0;

	state.clients.forEach((userClients) => {
		userClients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(messageStr);
				count++;
			}
		});
	});

	console.log(`[WebSocket] Broadcast message to ${count} clients`);
	return count;
}

export function getConnectedUserIds(): string[] {
	const state = getGlobalState();
	return Array.from(state.clients.keys());
}

export function isUserConnected(userId: string): boolean {
	const state = getGlobalState();
	const userClients = state.clients.get(userId);
	return !!userClients && userClients.size > 0;
}
