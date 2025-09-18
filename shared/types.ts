export interface User {
    userId: string;
    username: string;
    createdAt: string;
    stats: {
        gamesPlayed: number;
        gamesWon: number;
        rating: number;
    };
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