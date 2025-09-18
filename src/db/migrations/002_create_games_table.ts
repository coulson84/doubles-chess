import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('games', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 6).unique().notNullable();
    table.uuid('white_player_id').references('id').inTable('users');
    table.uuid('black_player_id').references('id').inTable('users');
    table.uuid('white_partner_id').references('id').inTable('users');
    table.uuid('black_partner_id').references('id').inTable('users');
    table.text('pgn');
    table.jsonb('current_position').notNullable();
    table.enum('status', ['waiting', 'active', 'completed', 'abandoned']).defaultTo('waiting');
    table.enum('result', ['white', 'black', 'draw', null]);
    table.enum('turn', ['white', 'black']).defaultTo('white');
    table.integer('move_number').defaultTo(1);
    table.timestamp('last_move_at');
    table.timestamps(true, true);

    table.index('code');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('games');
}