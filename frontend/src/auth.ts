import type { User } from '../../shared/types.ts';

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
}

class AuthManager {
    private state: AuthState = {
        isAuthenticated: false,
        user: null
    };

    private listeners: ((state: AuthState) => void)[] = [];

    constructor() {
        // Check auth status on initialization
        this.checkAuthStatus();
    }

    private setState(newState: Partial<AuthState>): void {
        this.state = { ...this.state, ...newState };
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
                credentials: 'include', // Include cookies
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
                user: data.user
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
                credentials: 'include', // Include cookies
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
                user: data.user
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
                credentials: 'include' // Include cookies for authentication
            });

            if (response.ok) {
                const data = await response.json();
                this.setState({
                    isAuthenticated: true,
                    user: data.user
                });
            } else {
                this.setState({
                    isAuthenticated: false,
                    user: null
                });
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.setState({
                isAuthenticated: false,
                user: null
            });
        }
    }

    public async logout(): Promise<void> {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include' // Include cookies
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.setState({
            isAuthenticated: false,
            user: null
        });
    }
}

export const authManager = new AuthManager();