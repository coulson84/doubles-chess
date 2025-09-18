import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import cors from '@middy/http-cors';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { createHash, randomBytes } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'chess-doubles-users';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

interface AuthRequest {
    action: 'register' | 'login' | 'verify';
    username?: string;
    password?: string;
    token?: string;
}

const inputSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['register', 'login', 'verify']
                },
                username: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 20
                },
                password: {
                    type: 'string',
                    minLength: 8
                },
                token: { type: 'string' }
            },
            required: ['action']
        }
    }
};

function hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
}

function generateToken(userId: string): string {
    const payload = {
        userId,
        exp: Date.now() + 24 * 60 * 60 * 1000,
        iat: Date.now()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token: string): { userId: string; exp: number } | null {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        if (payload.exp < Date.now()) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

const baseHandler = async (
    event: APIGatewayProxyEvent & { body: AuthRequest },
    context: Context
): Promise<APIGatewayProxyResult> => {
    const { action, username, password, token } = event.body;

    switch (action) {
        case 'register': {
            if (!username || !password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Username and password required' })
                };
            }

            const existingUser = await docClient.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { username }
            }));

            if (existingUser.Item) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'User already exists' })
                };
            }

            const salt = randomBytes(16).toString('hex');
            const hashedPassword = hashPassword(password, salt);
            const userId = `user-${Date.now()}-${randomBytes(4).toString('hex')}`;

            await docClient.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: {
                    username,
                    userId,
                    password: hashedPassword,
                    salt,
                    createdAt: new Date().toISOString(),
                    stats: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        rating: 1200
                    }
                }
            }));

            const authToken = generateToken(userId);

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: 'User registered successfully',
                    token: authToken,
                    userId
                })
            };
        }

        case 'login': {
            if (!username || !password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Username and password required' })
                };
            }

            const result = await docClient.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { username }
            }));

            if (!result.Item) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }

            const user = result.Item;
            const hashedPassword = hashPassword(password, user.salt);

            if (hashedPassword !== user.password) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: 'Invalid credentials' })
                };
            }

            const authToken = generateToken(user.userId);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Login successful',
                    token: authToken,
                    userId: user.userId,
                    username: user.username
                })
            };
        }

        case 'verify': {
            if (!token) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Token required' })
                };
            }

            const payload = verifyToken(token);

            if (!payload) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ error: 'Invalid or expired token' })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    valid: true,
                    userId: payload.userId
                })
            };
        }

        default:
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid action' })
            };
    }
};

export const handler = middy()
    .use(httpJsonBodyParser())
    .use(validator({ eventSchema: transpileSchema(inputSchema) }))
    .use(httpErrorHandler())
    .use(cors())
    .handler(baseHandler);