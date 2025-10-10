import { writable } from 'svelte/store';
import type { WebSocketMessage, WebSocketEventType } from './types';
import { browser } from '$app/environment';

type EventHandler = (payload: unknown) => void;

class WebSocketClient {
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private userId: string | null = null;
	private eventHandlers = new Map<WebSocketEventType, Set<EventHandler>>();

	public connected = writable(false);
	public connecting = writable(false);

	connect(userId: string) {
		if (!browser) {
			return; // Don't connect on server
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			return; // Already connected
		}

		this.userId = userId;
		this.connecting.set(true);

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log('WebSocket connected');
				this.connected.set(true);
				this.connecting.set(false);
				this.reconnectAttempts = 0;
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error);
				}
			};

			this.ws.onclose = () => {
				console.log('WebSocket disconnected');
				this.connected.set(false);
				this.connecting.set(false);
				this.ws = null;
				this.scheduleReconnect();
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.connecting.set(false);
			};
		} catch (error) {
			console.error('Failed to create WebSocket:', error);
			this.connecting.set(false);
			this.scheduleReconnect();
		}
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connected.set(false);
		this.connecting.set(false);
		this.userId = null;
	}

	private scheduleReconnect() {
		if (this.reconnectTimer || !this.userId) {
			return;
		}

		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log('Max reconnection attempts reached');
			return;
		}

		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
		this.reconnectAttempts++;

		console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			if (this.userId) {
				this.connect(this.userId);
			}
		}, delay);
	}

	private handleMessage(message: WebSocketMessage) {
		const handlers = this.eventHandlers.get(message.type);
		if (handlers) {
			handlers.forEach((handler) => {
				try {
					handler(message.payload);
				} catch (error) {
					console.error(`Error handling WebSocket message (${message.type}):`, error);
				}
			});
		}
	}

	on(eventType: WebSocketEventType, handler: EventHandler) {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, new Set());
		}
		this.eventHandlers.get(eventType)!.add(handler);

		// Return unsubscribe function
		return () => {
			const handlers = this.eventHandlers.get(eventType);
			if (handlers) {
				handlers.delete(handler);
			}
		};
	}

	off(eventType: WebSocketEventType, handler?: EventHandler) {
		if (!handler) {
			// Remove all handlers for this event type
			this.eventHandlers.delete(eventType);
		} else {
			// Remove specific handler
			const handlers = this.eventHandlers.get(eventType);
			if (handlers) {
				handlers.delete(handler);
			}
		}
	}

	send(message: WebSocketMessage) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.warn('Cannot send message - WebSocket not connected');
		}
	}
}

// Export singleton instance
export const wsClient = new WebSocketClient();
