/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('game_boards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('gameId').notNullable().references('id').inTable('games').onDelete('CASCADE');
    table.integer('boardNumber').notNullable(); // 1 or 2
    table.uuid('whitePlayerId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('blackPlayerId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('fen').notNullable().defaultTo('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // Chess board state in FEN notation
    table.jsonb('moveHistory').notNullable().defaultTo('[]'); // Array of moves
    table.uuid('currentTurnUserId').notNullable().references('id').inTable('users').onDelete('CASCADE'); // Which player's turn it is
    table.timestamp('lastMoveAt').defaultTo(knex.fn.now());
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.unique(['gameId', 'boardNumber']);
    table.index(['gameId']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('game_boards');
};
