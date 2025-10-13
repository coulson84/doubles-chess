import { DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD, DATABASE_PORT, DATABASE_USER } from "$lib/env.server";
import knexLib from 'knex';

const knex = knexLib({
  client: 'pg',
  connection: {
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
  },
  migrations: {
    tableName: 'migrations',
  },
});

export default knex;