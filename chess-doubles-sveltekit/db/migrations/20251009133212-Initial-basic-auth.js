/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema
    // Create users table
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
      table.uuid('uuid').notNullable().unique().defaultTo(knex.raw('uuidv7()'));
      table.string('name', 255);
      table.string('email', 255);
      table.timestamp('emailVerified').defaultTo(null);
      table.text('image');
    })
    // Create accounts table
    .createTable('accounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
      table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 255).notNullable();
      table.string('provider', 255).notNullable();
      table.string('providerAccountId', 255).notNullable();
      table.text('refresh_token');
      table.text('access_token');
      table.bigInteger('expires_at');
      table.text('id_token');
      table.text('scope');
      table.text('session_state');
      table.text('token_type');
    })
    // Create sessions table
    .createTable('sessions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
      table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('expires').notNullable();
      table.string('sessionToken', 255).notNullable().unique();
    })
    // Create verification_token table
    .createTable('verification_token', (table) => {
      table.text('identifier').notNullable();
      table.timestamp('expires').notNullable();
      table.text('token').notNullable();
      table.primary(['identifier', 'token']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema
    .dropTableIfExists('verification_token')
    .dropTableIfExists('sessions')
    .dropTableIfExists('accounts')
    .dropTableIfExists('users');
};
