import type { PageServerLoad } from './$types';
import knex from '../../../db.server';
import { error } from '@sveltejs/kit';

type Game = {
	id: string;
	createdBy: string;
	status: 'awaitingPlayers' | 'readyToStart' | 'inProgress' | 'complete';
	createdAt: Date;
	updatedAt: Date;
};

type GameInvitation = {
	id: string;
	gameId: string;
	invitedBy: string;
	invitedUserId: string;
	status: 'pending' | 'accepted' | 'declined';
	createdAt: Date;
	respondedAt: Date | null;
	invitedUser: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
};

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const { gameId } = event.params;

	try {
		const game = await knex('games')
			.where({ id: gameId })
			.first();

		if (!game) {
			throw error(404, 'Game not found');
		}

		// Load pending invitations with user details
		const invitations = await knex('game_invitations')
			.where({ gameId, status: 'pending' })
			.join('users', 'game_invitations.invitedUserId', 'users.id')
			.select(
				'game_invitations.id',
				'game_invitations.gameId',
				'game_invitations.invitedBy',
				'game_invitations.invitedUserId',
				'game_invitations.status',
				'game_invitations.createdAt',
				'game_invitations.respondedAt',
				'users.id as user_id',
				'users.name as user_name',
				'users.email as user_email',
				'users.image as user_image'
			);

		// Transform the data
		const formattedInvitations: GameInvitation[] = invitations.map((inv: any) => ({
			id: inv.id,
			gameId: inv.gameId,
			invitedBy: inv.invitedBy,
			invitedUserId: inv.invitedUserId,
			status: inv.status,
			createdAt: inv.createdAt,
			respondedAt: inv.respondedAt,
			invitedUser: {
				id: inv.user_id,
				name: inv.user_name,
				email: inv.user_email,
				image: inv.user_image
			}
		}));

		return {
			session,
			game: game as Game,
			invitations: formattedInvitations
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching game:', err);
		throw error(500, 'Failed to load game');
	}
};
