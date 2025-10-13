import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import knex from '../../../../db.server';
import bcrypt from 'bcryptjs';
import { sendEmail } from '$lib/email/mailer.server';
import { signupConfirmationEmail } from '$lib/email/templates';
import crypto from 'crypto';

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

		// Create user and verification token in a transaction
		const result = await knex.transaction(async (trx) => {
			// Create user
			const [user] = await trx('users')
				.insert({
					email,
					password: hashedPassword,
					name,
					emailVerified: null,
					image: null
				})
				.returning(['id', 'email', 'name', 'image']);

			// Create verification token
			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

			await trx('verification_tokens').insert({
				user_id: user.id,
				token,
				type: 'email_verification',
				expires_at: expiresAt
			});

			return { user, token };
		});

		// Send verification email
		try {
			const verificationUrl = `${request.headers.get('origin') || 'http://localhost:5173'}/auth/verify-email?token=${result.token}`;

			const emailContent = signupConfirmationEmail({
				name: result.user.name,
				email: result.user.email,
				verificationUrl
			});

			await sendEmail({
				to: result.user.email,
				subject: emailContent.subject,
				html: emailContent.html,
				text: emailContent.text
			});
		} catch (emailError) {
			console.error('Failed to send verification email:', emailError);
			// Don't fail signup if email fails
		}

		return json({
			success: true,
			user: {
				id: result.user.id,
				email: result.user.email,
				name: result.user.name,
				image: result.user.image
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
