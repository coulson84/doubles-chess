import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/core/providers/google';
import Credentials from '@auth/core/providers/credentials';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';
import PostgresUUIDAdapter from './lib/auth-adapter.js';
import { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } from './lib/env.server.js';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  host: DATABASE_HOST || "localhost",
  user: DATABASE_USER || "postgres",
  password: DATABASE_PASSWORD || "postgres",
  database: DATABASE_NAME || "game_dev",
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
		}),
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const result = await pool.query(
					'SELECT * FROM users WHERE email = $1',
					[credentials.email]
				);

				const user = result.rows[0];

				if (!user || !user.password) {
					return null;
				}

				const isValid = await bcrypt.compare(
					credentials.password as string,
					user.password
				);

				if (!isValid) {
					return null;
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image
				};
			}
		})
	],
	session: {
		strategy: "jwt"
	},
	secret: AUTH_SECRET,
	trustHost: true,
	callbacks: {
		async jwt({ token, user, account }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.id) {
				session.user.id = token.id as string;
			}
			return session;
		}
	}
});
