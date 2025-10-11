/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.table('game_players', (table) => {
    table.integer('playerPosition').nullable(); // 1 or 2 to indicate player1 or player2 within their team
    table.unique(['gameId', 'team', 'playerPosition']); // Ensure unique position per team in a game
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.table('game_players', (table) => {
    table.dropUnique(['gameId', 'team', 'playerPosition']);
    table.dropColumn('playerPosition');
  });
}
