import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import db from '$lib/db.server';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    throw error(401, 'Unauthorized');
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

  return {
    game
  };
};
