import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { WebSocketMessage } from './types';

// Store connected clients mapped by user ID
const clients = new Map<string, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

export function initializeWebSocketServer() {
	console.log(new Error().stack);
	if (wss) {
		console.log("WebSocket server already initialized");
		return wss;
	}

	wss = new WebSocketServer({ noServer: true });

	wss.on('connection', (ws: WebSocket, request: IncomingMessage, userId: string) => {
		console.log(`WebSocket client connected: ${userId}`);

		// Add client to the map
		if (!clients.has(userId)) {
			clients.set(userId, new Set());
		}
		clients.get(userId)!.add(ws);

		// Send connection confirmation
		ws.send(JSON.stringify({ type: 'connected', payload: { userId } }));

		ws.on('close', () => {
			console.log(`WebSocket client disconnected: ${userId}`);
			const userClients = clients.get(userId);
			if (userClients) {
				userClients.delete(ws);
				if (userClients.size === 0) {
					clients.delete(userId);
				}
			}
		});

		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
		});

		// Handle ping/pong for connection health
		ws.on('pong', () => {
			// Client is alive
		});
	});

	console.log("Set interval")
	// Set up ping interval to keep connections alive
	const pingInterval = setInterval(() => {
		console.log("a");
		console.log(wss?.clients.size, 'connected WebSocket clients');
		console.log(WebSocket);
		wss?.clients.forEach((ws) => {
			console.log(ws.readyState);
			if (ws.readyState === WebSocket.OPEN) {
				ws.ping(String(Date.now()));
			}
		});
	}, 30000); // Ping every 30 seconds

	wss.on('close', () => {
		console.log("close websocket server");
		clearInterval(pingInterval);
	});

	return wss;
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
	const userClients = clients.get(userId);
	if (!userClients || userClients.size === 0) {
		console.log("Found no WebSocket connections for user", userId);
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

	return sent;
}

export function sendToUsers(userIds: string[], message: WebSocketMessage) {
	const results = userIds.map((userId) => sendToUser(userId, message));
	return results.some((sent) => sent);
}

export function broadcastToAll(message: WebSocketMessage) {
	const messageStr = JSON.stringify(message);
	let count = 0;

	clients.forEach((userClients) => {
		userClients.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(messageStr);
				count++;
			}
		});
	});

	return count;
}

export function getConnectedUserIds(): string[] {
	return Array.from(clients.keys());
}

export function isUserConnected(userId: string): boolean {
	const userClients = clients.get(userId);
	return !!userClients && userClients.size > 0;
}
