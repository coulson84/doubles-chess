import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import knex from '../../../lib/db.server';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			error: 'Invalid verification link'
		};
	}

	try {
		// Find the verification token
		const verificationToken = await knex('verification_tokens')
			.where({ token, type: 'email_verification' })
			.whereNull('used_at')
			.first();

		if (!verificationToken) {
			return {
				error: 'Invalid or expired verification link'
			};
		}

		// Check if token is expired
		if (new Date(verificationToken.expires_at) < new Date()) {
			return {
				error: 'Verification link has expired'
			};
		}

		// Mark token as used and verify email in a transaction
		await knex.transaction(async (trx) => {
			await trx('verification_tokens')
				.where({ id: verificationToken.id })
				.update({ used_at: new Date() });

			await trx('users')
				.where({ id: verificationToken.user_id })
				.update({ emailVerified: new Date() });
		});

		return {
			success: true
		};
	} catch (err) {
		console.error('Email verification error:', err);
		return {
			error: 'An error occurred during verification'
		};
	}
};
