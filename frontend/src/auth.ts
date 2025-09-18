import type { User } from '../../shared/types.ts';

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
}

class AuthManager {
    private state: AuthState = {
        isAuthenticated: false,
        user: null,
        token: null
    };

    private listeners: ((state: AuthState) => void)[] = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const token = localStorage.getItem('chess_doubles_token');
            const userStr = localStorage.getItem('chess_doubles_user');

            if (token && userStr) {
                const user = JSON.parse(userStr);
                this.setState({
                    isAuthenticated: true,
                    user,
                    token
                });
            }
        } catch (error) {
            console.error('Failed to load auth state from storage:', error);
            this.clearStorage();
        }
    }

    private saveToStorage(): void {
        if (this.state.token && this.state.user) {
            localStorage.setItem('chess_doubles_token', this.state.token);
            localStorage.setItem('chess_doubles_user', JSON.stringify(this.state.user));
        } else {
            this.clearStorage();
        }
    }

    private clearStorage(): void {
        localStorage.removeItem('chess_doubles_token');
        localStorage.removeItem('chess_doubles_user');
    }

    private setState(newState: Partial<AuthState>): void {
        this.state = { ...this.state, ...newState };
        this.saveToStorage();
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.state));
    }

    public getState(): AuthState {
        return { ...this.state };
    }

    public subscribe(listener: (state: AuthState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    public async login(emailOrUsername: string, password: string): Promise<void> {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailOrUsername,
                    password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Login failed');
            }

            const data = await response.json();

            this.setState({
                isAuthenticated: true,
                user: data.user,
                token: data.token
            });
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    public async register(email: string, username: string, password: string): Promise<void> {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    username,
                    password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Registration failed');
            }

            const data = await response.json();

            this.setState({
                isAuthenticated: true,
                user: data.user,
                token: data.token
            });
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    public async loginWithProvider(provider: 'google'): Promise<void> {
        // OAuth login - redirect to backend OAuth endpoint
        window.location.href = `/api/auth/${provider}`;
    }

    public async checkAuthStatus(): Promise<void> {
        try {
            const response = await fetch('/api/auth/me', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.setState({
                    isAuthenticated: true,
                    user: data.user,
                    token: this.state.token
                });
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    public async logout(): Promise<void> {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Logout error:', error);
        }


        this.setState({
            isAuthenticated: false,
            user: null,
            token: null
        });
        this.clearStorage();
    }

    public getAuthHeaders(): Record<string, string> {
        if (this.state.token) {
            return {
                'Authorization': `Bearer ${this.state.token}`
            };
        }
        return {};
    }
}

export const authManager = new AuthManager();