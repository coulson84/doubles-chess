/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('game_invitations', (table) => {
    // Team assignment: 'white' or 'black', null if not yet assigned
    table.enum('team', ['white', 'black']).nullable().defaultTo(null);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('game_invitations', (table) => {
    table.dropColumn('team');
  });
}
