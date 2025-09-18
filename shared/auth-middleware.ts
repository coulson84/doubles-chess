import type { APIGatewayProxyEvent } from 'aws-lambda';

interface AuthContext {
    userId?: string;
    isAuthenticated: boolean;
}

export const createAuthMiddleware = () => {
    const before = async (request: { event: APIGatewayProxyEvent & { auth?: AuthContext } }) => {
        const token = request.event.headers.Authorization || request.event.headers.authorization;

        if (!token) {
            request.event.auth = { isAuthenticated: false };
            return;
        }

        try {
            const tokenValue = token.replace('Bearer ', '');
            const payload = JSON.parse(Buffer.from(tokenValue, 'base64').toString());

            if (payload.exp < Date.now()) {
                request.event.auth = { isAuthenticated: false };
                return;
            }

            request.event.auth = {
                userId: payload.userId,
                isAuthenticated: true
            };
        } catch (error) {
            request.event.auth = { isAuthenticated: false };
        }
    };

    return { before };
};

export const requireAuth = () => {
    const before = async (request: { event: APIGatewayProxyEvent & { auth?: AuthContext } }) => {
        if (!request.event.auth?.isAuthenticated) {
            const error = new Error('Unauthorized');
            (error as any).statusCode = 401;
            throw error;
        }
    };

    return { before };
};