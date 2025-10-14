import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db.server';


// GET /api/games - List all games for the current user
export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const games = await db('games')
    .where('user_id', session.user.id)
    .orderBy('created_at', 'desc')
    .select('*');

  return json({ games });
};

// POST /api/games - Create a new game
export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [game] = await db('games')
    .insert({
      user_id: session.user.id,
      status: 'in_progress',
      game_state: {}
    })
    .returning('*');

  return json({ game }, { status: 201 });
};
