export type WebSocketEventType =
	| 'game_invite_received'
	| 'game_invite_accepted'
	| 'game_invite_declined'
	| 'game_started'
	| 'game_updated'
	| 'player_ejected'
	| 'friend_request_received'
	| 'friend_request_accepted';

export interface WebSocketMessage {
	type: WebSocketEventType;
	payload: unknown;
}

export interface GameInviteReceivedPayload {
	gameId: string;
	invitedBy: {
		id: string;
		name: string;
		image: string | null;
	};
}

export interface GameInviteResponsePayload {
	gameId: string;
	invitationId: string;
	userId: string;
	userName: string;
	status: 'accepted' | 'declined';
}

export interface GameUpdatedPayload {
	gameId: string;
	status: string;
}

export interface FriendRequestPayload {
	requestId: string;
	fromUser: {
		id: string;
		name: string;
		image: string | null;
	};
}

export interface PlayerEjectedPayload {
	gameId: string;
	message: string;
}
