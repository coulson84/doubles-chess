/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
	return knex.schema.createTable('game_players', (table) => {
		table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
		table.uuid('gameId').notNullable().references('id').inTable('games').onDelete('CASCADE');
		table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
		table.enum('team', ['white', 'black']).nullable();
		table.boolean('isCreator').notNullable().defaultTo(false);
		table.timestamp('joinedAt').notNullable().defaultTo(knex.fn.now());

		table.unique(['gameId', 'userId']);
		table.index(['gameId']);
		table.index(['userId']);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
	return knex.schema.dropTable('game_players');
};
