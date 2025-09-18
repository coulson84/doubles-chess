import type { OAuthProvider } from './types.ts';

// OAuth provider configurations
// In production, these would be loaded from environment variables
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
    google: {
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback/google',
        scope: ['openid', 'email', 'profile']
    },
    facebook: {
        name: 'facebook',
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/auth/callback/facebook',
        scope: ['email', 'public_profile']
    },
    microsoft: {
        name: 'microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/auth/callback/microsoft',
        scope: ['openid', 'email', 'profile']
    }
};

// OAuth URLs for each provider
export const OAUTH_URLS = {
    google: {
        authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo'
    },
    facebook: {
        authorize: 'https://www.facebook.com/v18.0/dialog/oauth',
        token: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfo: 'https://graph.facebook.com/v18.0/me'
    },
    microsoft: {
        authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfo: 'https://graph.microsoft.com/v1.0/me'
    }
};

export function generateAuthUrl(provider: 'google' | 'facebook' | 'microsoft', state: string): string {
    const config = OAUTH_PROVIDERS[provider];
    const urls = OAUTH_URLS[provider];

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope.join(' '),
        state: state,
        ...(provider === 'google' && { access_type: 'offline', prompt: 'consent' }),
        ...(provider === 'microsoft' && { response_mode: 'query' })
    });

    return `${urls.authorize}?${params.toString()}`;
}

export function generateState(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}