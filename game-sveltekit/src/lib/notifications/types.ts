export interface PushSubscription {
	id?: string;
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface NotificationPayload {
	title: string;
	body: string;
	icon?: string;
	badge?: string;
	data?: Record<string, any>;
	tag?: string;
	requireInteraction?: boolean;
}

export type NotificationType =
	| 'game_invite'
	| 'friend_request'
	| 'game_move'
	| 'game_started'
	| 'game_ended';

export interface ChessNotification extends NotificationPayload {
	type: NotificationType;
}
