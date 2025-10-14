import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../lib/db.server';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = url.searchParams.get('q') || '';
  const currentUserId = session.user.id;

  try {
    if (!query.trim()) {
      // If no query, return only friends
      const friends = await knex('friends')
        .select(
          'users.id',
          'users.name',
          'users.email',
          'users.image',
          knex.raw('true as is_friend')
        )
        .join('users', function() {
          this.on('users.id', '=', 'friends.friendId')
            .orOn('users.id', '=', 'friends.userId')
        })
        .where(function() {
          this.where('friends.userId', currentUserId)
            .orWhere('friends.friendId', currentUserId);
        })
        .where('friends.status', 'accepted')
        .where('users.id', '!=', currentUserId)
        .limit(10);

      return json({ users: friends });
    }

    // Search across all users
    const searchPattern = `%${query.trim().toLowerCase()}%`;

    // Get all matching users
    const allUsers = await knex('users')
      .select(
        'users.id',
        'users.name',
        'users.email',
        'users.image',
        knex.raw('CASE WHEN friends.id IS NOT NULL THEN 1 ELSE 0 END as is_friend')
      )
      .leftOuterJoin('friends', function() {
        this.on('users.id', '=', 'friends.friendId')
          .orOn('users.id', '=', 'friends.userId')
          .andOn('friends.status', '=', knex.raw('?', ['accepted']));
      })
      .where('users.id', '!=', currentUserId)
      .where(function() {
        this.whereRaw('LOWER(users.name) LIKE ?', [searchPattern])
          .orWhereRaw('LOWER(users.email) LIKE ?', [searchPattern]);
      })
      .orderBy('is_friend', 'desc')
      .limit(10);

    return json({ users: allUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return json({ error: 'Failed to search users' }, { status: 500 });
  }
};
