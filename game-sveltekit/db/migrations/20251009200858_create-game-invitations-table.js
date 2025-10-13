/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('game_invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
    table.uuid('gameId').notNullable().references('id').inTable('games').onDelete('CASCADE');
    table.uuid('invitedBy').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('invitedUserId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'accepted', 'declined']).notNullable().defaultTo('pending');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('respondedAt');

    // Ensure no duplicate invitations
    table.unique(['gameId', 'invitedUserId']);

    // Create indexes for faster lookups
    table.index('gameId');
    table.index('invitedUserId');
    table.index('status');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('game_invitations');
}
