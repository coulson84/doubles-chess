const API_BASE_URL = '/api';

class ApiService {
    private async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
            credentials: 'include' // Include cookies for authentication
        });
    }

    async createGame(isPrivate: boolean = false) {
        const response = await this.fetch('/games/create', {
            method: 'POST',
            body: JSON.stringify({ isPrivate })
        });

        if (!response.ok) {
            throw new Error('Failed to create game');
        }

        return response.json();
    }

    async joinGame(code: string, side?: 'white' | 'black') {
        const response = await this.fetch(`/games/join/${code}`, {
            method: 'POST',
            body: JSON.stringify({ side })
        });

        if (!response.ok) {
            throw new Error('Failed to join game');
        }

        return response.json();
    }

    async getGame(id: string) {
        const response = await this.fetch(`/games/game/${id}`);

        if (!response.ok) {
            throw new Error('Failed to get game');
        }

        return response.json();
    }

    async listMyGames() {
        const response = await this.fetch('/games/my-games');

        if (!response.ok) {
            throw new Error('Failed to list games');
        }

        return response.json();
    }

    async listUnstartedGames() {
        const response = await this.fetch('/games/unstarted');

        if (!response.ok) {
            throw new Error('Failed to list unstarted games');
        }

        return response.json();
    }

    async makeMove(gameId: string, from: string, to: string, promotion?: string) {
        const response = await this.fetch(`/games/game/${gameId}/move`, {
            method: 'POST',
            body: JSON.stringify({ from, to, promotion })
        });

        if (!response.ok) {
            throw new Error('Failed to make move');
        }

        return response.json();
    }

    async resign(gameId: string) {
        const response = await this.fetch(`/games/game/${gameId}/resign`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to resign');
        }

        return response.json();
    }

    async getMyGames() {
        const response = await this.fetch('/games/my-games');

        if (!response.ok) {
            throw new Error('Failed to get games');
        }

        return response.json();
    }

    async getActiveGames() {
        const response = await this.fetch('/games/active');

        if (!response.ok) {
            throw new Error('Failed to get active games');
        }

        return response.json();
    }
}

export const apiService = new ApiService();