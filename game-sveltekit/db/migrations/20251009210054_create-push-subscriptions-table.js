/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
	await knex.schema.createTable('push_subscriptions', (table) => {
		table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
		table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
		table.text('endpoint').notNullable();
		table.text('p256dh').notNullable();
		table.text('auth').notNullable();
		table.timestamp('created_at').defaultTo(knex.fn.now());
		table.timestamp('updated_at').defaultTo(knex.fn.now());

		// Ensure unique subscription per user + endpoint combination
		table.unique(['user_id', 'endpoint']);

		// Index for faster lookups by user
		table.index('user_id');
	});
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
	await knex.schema.dropTableIfExists('push_subscriptions');
}
