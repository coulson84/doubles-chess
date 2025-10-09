/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('games', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
    table.uuid('createdBy').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['awaitingPlayers', 'readyToStart', 'inProgress', 'complete']).notNullable().defaultTo('awaitingPlayers');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('games');
}
