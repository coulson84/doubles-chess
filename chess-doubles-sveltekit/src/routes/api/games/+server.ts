import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '$lib/db.server';

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

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Extract configuration options with defaults
    const isPrivate = body.isPrivate ?? false;
    const timeLimitPerMove = body.timeLimitPerMove ?? null;
    const isRated = body.isRated ?? false;
    const teamAssignment = body.teamAssignment ?? 'manual';

    // Validate teamAssignment
    if (!['manual', 'random'].includes(teamAssignment)) {
      return json({ error: 'Invalid team assignment option' }, { status: 400 });
    }

    // Validate timeLimitPerMove if provided
    if (timeLimitPerMove !== null && (typeof timeLimitPerMove !== 'number' || timeLimitPerMove <= 0)) {
      return json({ error: 'Time limit per move must be a positive number' }, { status: 400 });
    }

    // Create a new game and add creator as a player
    const [game] = await knex.transaction(async (trx) => {
      const [newGame] = await trx('games')
        .insert({
          createdBy: session.user.id,
          status: 'awaitingPlayers',
          isPrivate,
          timeLimitPerMove,
          isRated,
          teamAssignment
        })
        .returning('*');

      // Randomly assign creator to a team
      const creatorTeam = Math.random() < 0.5 ? 'white' : 'black';

      // Add creator to game_players
      await trx('game_players').insert({
        gameId: newGame.id,
        userId: session.user.id,
        team: creatorTeam,
        isCreator: true
      });

      return [newGame];
    });

    return json({ game }, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return json({ error: 'Failed to create game' }, { status: 500 });
  }
};
