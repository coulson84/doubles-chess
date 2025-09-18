import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import cors from '@middy/http-cors';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import inputOutputLogger from '@middy/input-output-logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'chess-doubles-games';

interface GameRequest {
    action: 'create' | 'get' | 'move' | 'list';
    gameId?: string;
    playerId?: string;
    move?: {
        from: string;
        to: string;
    };
}

const inputSchema = {
    type: 'object',
    properties: {
        body: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'get', 'move', 'list']
                },
                gameId: { type: 'string' },
                playerId: { type: 'string' },
                move: {
                    type: 'object',
                    properties: {
                        from: { type: 'string' },
                        to: { type: 'string' }
                    },
                    required: ['from', 'to']
                }
            },
            required: ['action']
        }
    }
};

const baseHandler = async (
    event: APIGatewayProxyEvent & { body: GameRequest },
    context: Context
): Promise<APIGatewayProxyResult> => {
    const { action, gameId, playerId, move } = event.body;

    switch (action) {
        case 'create': {
            const newGameId = `game-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const game = {
                gameId: newGameId,
                createdAt: new Date().toISOString(),
                status: 'waiting',
                players: [],
                moves: [],
                currentTurn: null
            };

            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: game
            }));

            return {
                statusCode: 201,
                body: JSON.stringify({ gameId: newGameId, message: 'Game created successfully' })
            };
        }

        case 'get': {
            if (!gameId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'gameId is required' })
                };
            }

            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { gameId }
            }));

            if (!result.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Game not found' })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify(result.Item)
            };
        }

        case 'move': {
            if (!gameId || !playerId || !move) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'gameId, playerId, and move are required' })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Move recorded',
                    gameId,
                    playerId,
                    move
                })
            };
        }

        case 'list': {
            const result = await docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'status-createdAt-index',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'waiting'
                },
                Limit: 10
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({ games: result.Items || [] })
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
    .use(inputOutputLogger())
    .use(httpJsonBodyParser())
    .use(validator({ eventSchema: transpileSchema(inputSchema) }))
    .use(httpErrorHandler())
    .use(cors())
    .handler(baseHandler);