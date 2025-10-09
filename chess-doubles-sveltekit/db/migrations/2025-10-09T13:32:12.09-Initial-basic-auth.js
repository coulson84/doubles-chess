export function up(knex) {
  return knex.schema
    // Create users table
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name', 255);
      table.string('email', 255);
      table.timestamp('emailVerified').defaultTo(null);
      table.text('image');
    })
    // Create accounts table
    .createTable('accounts', (table) => {
      table.increments('id').primary();
      table.integer('userId').notNullable();
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
      table.increments('id').primary();
      table.integer('userId').notNullable();
      table.timestamp('expires').notNullable();
      table.string('sessionToken', 255).notNullable();
    })
    // Create verification_token table
    .createTable('verification_token', (table) => {
      table.text('identifier').notNullable();
      table.timestamp('expires').notNullable();
      table.text('token').notNullable();
      table.primary(['identifier', 'token']);
    });
};

export function down(knex) {
  return knex.schema
    .dropTableIfExists('verification_token')
    .dropTableIfExists('sessions')
    .dropTableIfExists('accounts')
    .dropTableIfExists('users');
};
