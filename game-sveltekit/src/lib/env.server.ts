import { env } from '$env/dynamic/private';

export const DATABASE_HOST = env.DATABASE_HOST || "localhost";
export const DATABASE_USER = env.DATABASE_USER || "postgres";
export const DATABASE_PASSWORD = env.DATABASE_PASSWORD || "postgres";
export const DATABASE_NAME = env.DATABASE_NAME || "game_dev";
export const DATABASE_PORT = parseInt(env.DATABASE_PORT || "5435");

export const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';
export const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';
export const VAPID_SUBJECT = env.VAPID_SUBJECT || 'mailto:admin@example.com';
