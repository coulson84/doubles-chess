import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../../knexfile.js';

const db = knex.default;

// GET /api/games/[gameId] - Get a specific game
export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const game = await db('games')
    .where({
      id: params.gameId,
      user_id: session.user.id
    })
    .first();

  if (!game) {
    throw error(404, 'Game not found');
  }

  return json({ game });
};

// PATCH /api/games/[gameId] - Update game state or status
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const game = await db('games')
    .where({
      id: params.gameId,
      user_id: session.user.id
    })
    .first();

  if (!game) {
    throw error(404, 'Game not found');
  }

  const body = await request.json();
  const updates: any = {
    updated_at: db.fn.now()
  };

  if (body.game_state !== undefined) {
    updates.game_state = body.game_state;
  }

  if (body.status !== undefined) {
    updates.status = body.status;
  }

  const [updatedGame] = await db('games')
    .where('id', params.gameId)
    .update(updates)
    .returning('*');

  return json({ game: updatedGame });
};

// DELETE /api/games/[gameId] - Delete a game
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const game = await db('games')
    .where({
      id: params.gameId,
      user_id: session.user.id
    })
    .first();

  if (!game) {
    throw error(404, 'Game not found');
  }

  await db('games')
    .where('id', params.gameId)
    .delete();

  return json({ success: true });
};
