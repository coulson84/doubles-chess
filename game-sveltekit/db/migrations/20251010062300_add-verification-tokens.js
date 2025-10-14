/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.string('type', 50).notNullable(); // 'email_verification', 'password_reset', etc.
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('used_at').nullable();

    table.index(['token']);
    table.index(['user_id', 'type']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTable('verification_tokens');
}
