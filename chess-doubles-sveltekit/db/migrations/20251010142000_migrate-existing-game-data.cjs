/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
	// Get all games
	const games = await knex('games').select('*');

	for (const game of games) {
		// Check if creator already exists in game_players
		const existingCreator = await knex('game_players')
			.where({ gameId: game.id, userId: game.createdBy })
			.first();

		if (!existingCreator) {
			// Randomly assign creator to a team
			const creatorTeam = Math.random() < 0.5 ? 'white' : 'black';

			// Add creator to game_players
			await knex('game_players').insert({
				gameId: game.id,
				userId: game.createdBy,
				team: creatorTeam,
				isCreator: true
			});
		}

		// Get all accepted invitations for this game
		const acceptedInvitations = await knex('game_invitations')
			.where({ gameId: game.id, status: 'accepted' })
			.select('*');

		for (const invitation of acceptedInvitations) {
			// Check if player already exists in game_players
			const existingPlayer = await knex('game_players')
				.where({ gameId: game.id, userId: invitation.invitedUserId })
				.first();

			if (!existingPlayer) {
				// Add player to game_players with their team from invitation
				await knex('game_players').insert({
					gameId: game.id,
					userId: invitation.invitedUserId,
					team: invitation.team,
					isCreator: false
				});
			}
		}
	}
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
	// Remove all non-creator entries from game_players
	// (Keep this simple - in production you'd want more careful handling)
	await knex('game_players').where({ isCreator: false }).del();
};
