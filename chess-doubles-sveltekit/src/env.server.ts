export const DATABASE_HOST = process.env.DATABASE_HOST || "localhost";
export const DATABASE_USER = process.env.DATABASE_USER || "postgres";
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || "postgres";
export const DATABASE_NAME = process.env.DATABASE_NAME || "chess_doubles_dev";
export const DATABASE_PORT = parseInt(process.env.DATABASE_PORT ?? "5435");