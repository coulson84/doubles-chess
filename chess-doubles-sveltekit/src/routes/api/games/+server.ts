import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../db.server';

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
