import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import knex from "$lib/db.server";
import type { Knex } from "knex";

function excludeUsersAlreadyInvited(
  queryBuilder: Knex.QueryBuilder,
  gameId?: string
) {
  if (gameId) {
    return queryBuilder.whereNotIn(
      "users.id",
      function (this: Knex.QueryBuilder) {
        this.select("invitedUserId")
          .from("game_invitations")
          .where("game_invitations.gameId", gameId)
          .union(function (this: Knex.QueryBuilder) {
            this.select("invitedBy")
              .from("game_invitations")
              .where("gameId", gameId);
          });
      }
    );
  }
}

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session?.user?.id) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = url.searchParams.get("q") || "";
  const currentUserId = session.user.id;
  const gameId = url.searchParams.get("gameId");

  try {
    if (!query.trim()) {
      // If no query, return recently active users (ordered by latest session)
      const recentUsersQuery = knex("users")
        .select(
          "users.id",
          "users.name",
          "users.image",
          knex.raw("MAX(sessions.id::text) as last_active")
        )
        .leftJoin("sessions", "sessions.userId", "users.id")
        .where("users.id", "!=", currentUserId)
        .orderBy("last_active", "desc")
        .groupBy("users.id", "users.name", "users.image")
        .limit(10);

      if (gameId) {
        excludeUsersAlreadyInvited(recentUsersQuery, gameId);
      }

      return json({ users: await recentUsersQuery });
    }

    // Search across all users by name only (don't expose emails)
    const searchPattern = `%${query.trim().toLowerCase()}%`;

    // Get all matching users
    const allUsersQuery = knex("users")
      .select("users.id", "users.name", "users.image")
      .where("users.id", "!=", currentUserId)
      .whereRaw("LOWER(users.name) LIKE ?", [searchPattern])
      .limit(10);

    if (gameId) {
      excludeUsersAlreadyInvited(allUsersQuery, gameId);
    }

    return json({ users: await allUsersQuery });
  } catch (error) {
    console.error("Error searching users:", error);
    return json({ error: "Failed to search users" }, { status: 500 });
  }
};
