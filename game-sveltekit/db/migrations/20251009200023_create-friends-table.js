/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('friends', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuidv7()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('friendId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('status', ['pending', 'accepted', 'rejected', 'blocked']).notNullable().defaultTo('pending');
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());

    // Ensure no duplicate friendships
    table.unique(['userId', 'friendId']);

    // Create indexes for faster lookups
    table.index('userId');
    table.index('friendId');
    table.index('status');

    // Ensure users can't friend themselves
    table.check('?? != ??', ['userId', 'friendId']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('friends');
}
