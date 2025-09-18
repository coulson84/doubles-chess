export interface User {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
    google_id?: string;
    rating: number;
    games_played: number;
    games_won: number;
    created_at: string;
    updated_at: string;
}

export interface AuthToken {
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
    tokenType: 'Bearer';
}

export interface OAuthProvider {
    name: 'google' | 'facebook' | 'microsoft';
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
}

export interface AuthCallbackData {
    code: string;
    state: string;
    provider: 'google' | 'facebook' | 'microsoft';
}

export interface Game {
    gameId: string;
    createdAt: string;
    status: 'waiting' | 'active' | 'completed';
    players: Player[];
    moves: Move[];
    currentTurn: string | null;
    winner?: string;
}

export interface Player {
    userId: string;
    username: string;
    team: 'white' | 'black';
    isActive: boolean;
}

export interface Move {
    playerId: string;
    from: string;
    to: string;
    piece: string;
    timestamp: string;
    notation: string;
}

export interface WebSocketMessage {
    type: 'connect' | 'disconnect' | 'move' | 'chat' | 'game_update';
    gameId?: string;
    playerId?: string;
    data: any;
    timestamp: string;
}

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}