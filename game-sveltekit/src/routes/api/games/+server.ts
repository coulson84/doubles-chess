import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../db.server';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all games created by this user
    const games = await knex('games')
      .where({ createdBy: session.user.id })
      .orderBy('createdAt', 'desc')
      .select('*');

    return json({ games }, { status: 200 });
  } catch (error) {
    console.error('Error fetching games:', error);
    return json({ error: 'Failed to fetch games' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create a new game
    const [game] = await knex('games')
      .insert({
        createdBy: session.user.id,
        status: 'awaitingPlayers'
      })
      .returning('*');

    return json({ game }, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return json({ error: 'Failed to create game' }, { status: 500 });
  }
};
