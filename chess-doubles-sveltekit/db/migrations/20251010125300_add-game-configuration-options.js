/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('games', (table) => {
    // Game visibility
    table.boolean('isPrivate').notNullable().defaultTo(false);

    // Time limit per move (in seconds, null = no limit)
    table.integer('timeLimitPerMove').nullable().defaultTo(null);

    // Rated vs unrated game
    table.boolean('isRated').notNullable().defaultTo(false);

    // Team assignment strategy: 'manual' or 'random'
    table.enum('teamAssignment', ['manual', 'random']).notNullable().defaultTo('manual');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('games', (table) => {
    table.dropColumn('isPrivate');
    table.dropColumn('timeLimitPerMove');
    table.dropColumn('isRated');
    table.dropColumn('teamAssignment');
  });
}
