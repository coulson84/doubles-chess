import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';
import PostgresUUIDAdapter from './lib/auth-adapter.js';
import { Pool } from "pg"
import { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } from './env.server';

const pool = new Pool({
  host: DATABASE_HOST || "localhost",
  user: DATABASE_USER || "postgres",
  password: DATABASE_PASSWORD || "postgres",
  database: DATABASE_NAME || "chess_doubles_dev",
  port: DATABASE_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: PostgresUUIDAdapter(pool),
	providers: [
		Google({
			clientId: AUTH_GOOGLE_ID,
			clientSecret: AUTH_GOOGLE_SECRET,
		})
	],
	secret: AUTH_SECRET,
	trustHost: true
});
