import knex from './db.server.js';

async function updateGame() {
  try {
    await knex('games')
      .where({ id: '0199cf18-2b32-7400-ba09-64c97f4d39e5' })
      .update({ teamAssignment: 'random' });

    console.log('Game updated to random team assignment');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateGame();
