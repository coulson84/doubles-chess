import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from '@auth/core/adapters';
import type { Pool } from '../../node_modules/@types/pg';

/**
 * Custom PostgreSQL adapter for Auth.js that uses UUID v7 for primary keys
 * instead of auto-incrementing integers.
 *
 * Based on @auth/pg-adapter but modified to work with UUID primary keys.
 */
export default function PostgresUUIDAdapter(pool: Pool): Adapter {
  return {
    async createUser(user) {
      const { rows } = await pool.query<AdapterUser>(
        `INSERT INTO users (name, email, "emailVerified", image)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, "emailVerified", image`,
        [user.name, user.email, user.emailVerified, user.image]
      );
      return rows[0];
    },

    async getUser(id) {
      const { rows } = await pool.query<AdapterUser>(
        `SELECT * FROM users WHERE id = $1`,
        [id]
      );
      return rows[0] ?? null;
    },

    async getUserByEmail(email) {
      const { rows } = await pool.query<AdapterUser>(
        `SELECT * FROM users WHERE email = $1`,
        [email]
      );
      return rows[0] ?? null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const { rows } = await pool.query<AdapterUser>(
        `SELECT u.* FROM users u
         JOIN accounts a ON u.id = a."userId"
         WHERE a."providerAccountId" = $1 AND a.provider = $2`,
        [providerAccountId, provider]
      );
      return rows[0] ?? null;
    },

    async updateUser(user) {
      const { rows } = await pool.query<AdapterUser>(
        `UPDATE users
         SET name = $2, email = $3, "emailVerified" = $4, image = $5
         WHERE id = $1
         RETURNING id, name, email, "emailVerified", image`,
        [user.id, user.name, user.email, user.emailVerified, user.image]
      );
      return rows[0];
    },

    async deleteUser(userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    },

    async linkAccount(account) {
      const { rows } = await pool.query<AdapterAccount>(
        `INSERT INTO accounts (
          "userId", type, provider, "providerAccountId",
          refresh_token, access_token, expires_at,
          token_type, scope, id_token, session_state
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token,
          account.access_token,
          account.expires_at,
          account.token_type,
          account.scope,
          account.id_token,
          account.session_state,
        ]
      );
      return rows[0];
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await pool.query(
        `DELETE FROM accounts WHERE "providerAccountId" = $1 AND provider = $2`,
        [providerAccountId, provider]
      );
    },

    async createSession(session) {
      const { rows } = await pool.query<AdapterSession>(
        `INSERT INTO sessions ("userId", expires, "sessionToken")
         VALUES ($1, $2, $3)
         RETURNING *`,
        [session.userId, session.expires, session.sessionToken]
      );
      return rows[0];
    },

    async getSessionAndUser(sessionToken) {
      const { rows } = await pool.query<AdapterSession & { user: AdapterUser }>(
        `SELECT s.*,
                u.id as "user.id",
                u.name as "user.name",
                u.email as "user.email",
                u."emailVerified" as "user.emailVerified",
                u.image as "user.image"
         FROM sessions s
         JOIN users u ON s."userId" = u.id
         WHERE s."sessionToken" = $1`,
        [sessionToken]
      );

      if (!rows[0]) return null;

      const row = rows[0];
      return {
        session: {
          id: row.id,
          userId: row.userId,
          sessionToken: row.sessionToken,
          expires: row.expires,
        },
        user: {
          id: row['user.id'],
          name: row['user.name'],
          email: row['user.email'],
          emailVerified: row['user.emailVerified'],
          image: row['user.image'],
        },
      };
    },

    async updateSession(session) {
      const { rows } = await pool.query<AdapterSession>(
        `UPDATE sessions
         SET expires = $2
         WHERE "sessionToken" = $1
         RETURNING *`,
        [session.sessionToken, session.expires]
      );
      return rows[0];
    },

    async deleteSession(sessionToken) {
      await pool.query(`DELETE FROM sessions WHERE "sessionToken" = $1`, [sessionToken]);
    },

    async createVerificationToken(token) {
      const { rows } = await pool.query<VerificationToken>(
        `INSERT INTO verification_token (identifier, expires, token)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [token.identifier, token.expires, token.token]
      );
      return rows[0];
    },

    async useVerificationToken({ identifier, token }) {
      const { rows } = await pool.query<VerificationToken>(
        `DELETE FROM verification_token
         WHERE identifier = $1 AND token = $2
         RETURNING *`,
        [identifier, token]
      );
      return rows[0] ?? null;
    },
  };
}
