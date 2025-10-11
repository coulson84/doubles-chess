import type { PageServerLoad } from './$types';
import knex from '$lib/db.server';
import { error } from '@sveltejs/kit';

type Game = {
	id: string;
	createdBy: string;
	status: 'awaitingPlayers' | 'readyToStart' | 'inProgress' | 'complete';
	createdAt: Date;
	updatedAt: Date;
	isPrivate: boolean;
	timeLimitPerMove: number | null;
	isRated: boolean;
	teamAssignment: 'manual' | 'random';
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
		image: string | null;
	};
};

type GameBoard = {
	id: string;
	gameId: string;
	boardNumber: number;
	whitePlayerId: string;
	blackPlayerId: string;
	fen: string;
	moveHistory: any[];
	currentTurnUserId: string;
	lastMoveAt: Date;
	createdAt: Date;
	updatedAt: Date;
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

		// Load all game players (creator + invited players)
		const gamePlayers = await knex('game_players')
			.where({ gameId })
			.join('users', 'game_players.userId', 'users.id')
			.select(
				'game_players.id',
				'game_players.gameId',
				'game_players.userId',
				'game_players.team',
				'game_players.playerPosition',
				'game_players.isCreator',
				'game_players.joinedAt',
				'users.id as user_id',
				'users.name as user_name',
				'users.image as user_image'
			);

		// Load pending and accepted invitations with user details
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
				image: inv.user_image
			}
		}));

		// Check if current user has been invited to this game
		let myInvitation = null;
		if (session?.user?.id) {
			myInvitation = await knex('game_invitations')
				.where({
					gameId,
					invitedUserId: session.user.id
				})
				.first();
		}

		// Transform game players data
		const formattedGamePlayers = gamePlayers.map((player: any) => ({
			id: player.id,
			gameId: player.gameId,
			userId: player.userId,
			team: player.team,
			playerPosition: player.playerPosition,
			isCreator: player.isCreator,
			joinedAt: player.joinedAt,
			user: {
				id: player.user_id,
				name: player.user_name,
				image: player.user_image
			}
		}));

		// Load game boards if game is in progress
		let gameBoards: GameBoard[] = [];
		if (game.status === 'inProgress') {
			gameBoards = await knex('game_boards')
				.where({ gameId })
				.orderBy('boardNumber', 'asc')
				.select('*');
		}

		return {
			session,
			game: game as Game,
			invitations: formattedInvitations,
			myInvitation,
			gamePlayers: formattedGamePlayers,
			gameBoards
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching game:', err);
		throw error(500, 'Failed to load game');
	}
};
