import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('moves', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('game_id').references('id').inTable('games').onDelete('CASCADE');
    table.uuid('player_id').references('id').inTable('users');
    table.integer('move_number').notNullable();
    table.string('from').notNullable();
    table.string('to').notNullable();
    table.string('piece').notNullable();
    table.string('captured');
    table.string('promotion');
    table.string('san').notNullable();
    table.jsonb('position_after').notNullable();
    table.timestamps(true, true);

    table.index(['game_id', 'move_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('moves');
}