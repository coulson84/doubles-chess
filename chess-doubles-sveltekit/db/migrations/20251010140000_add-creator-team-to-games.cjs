/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
	return knex.schema.table('games', (table) => {
		table.enum('creatorTeam', ['white', 'black']).nullable();
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
	return knex.schema.table('games', (table) => {
		table.dropColumn('creatorTeam');
	});
};
