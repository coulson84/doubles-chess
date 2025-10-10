/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
	return knex.schema.table('game_invitations', (table) => {
		table.dropColumn('team');
	}).table('games', (table) => {
		table.dropColumn('creatorTeam');
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
	return knex.schema.table('games', (table) => {
		table.enum('creatorTeam', ['white', 'black']).nullable();
	}).table('game_invitations', (table) => {
		table.enum('team', ['white', 'black']).nullable();
	});
};
