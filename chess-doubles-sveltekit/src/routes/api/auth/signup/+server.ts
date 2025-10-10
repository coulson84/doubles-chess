import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../db.server';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, password, name } = await request.json();

		// Validate input
		if (!email || !password || !name) {
			throw error(400, 'Email, password, and name are required');
		}

		if (password.length < 8) {
			throw error(400, 'Password must be at least 8 characters long');
		}

		// Check if user already exists
		const existingUser = await knex('users')
			.where({ email })
			.first();

		if (existingUser) {
			throw error(400, 'User with this email already exists');
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const [user] = await knex('users')
			.insert({
				email,
				password: hashedPassword,
				name,
				emailVerified: null,
				image: null
			})
			.returning(['id', 'email', 'name', 'image']);

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				image: user.image
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error creating user:', err);
		throw error(500, 'Failed to create user');
	}
};
