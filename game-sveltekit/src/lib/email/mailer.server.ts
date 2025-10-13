import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Create transporter based on environment
const transporter = nodemailer.createTransport(
	isDevelopment
		? {
				// MailDev for development
				host: env.SMTP_HOST || 'localhost',
				port: parseInt(env.SMTP_PORT || '1025'),
				ignoreTLS: true
		  }
		: {
				// Production SMTP settings
				host: env.SMTP_HOST,
				port: parseInt(env.SMTP_PORT || '587'),
				secure: env.SMTP_SECURE === 'true',
				auth: {
					user: env.SMTP_USER,
					pass: env.SMTP_PASS
				}
		  }
);

export interface EmailOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
	const from = env.SMTP_FROM || 'Chess Doubles <noreply@gamedev.com>';

	try {
		await transporter.sendMail({
			from,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html
		});

		if (isDevelopment) {
			console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
			console.log(`   View at: http://localhost:1080`);
		}
	} catch (error) {
		console.error('Failed to send email:', error);
		throw error;
	}
}

export async function verifyEmailConnection(): Promise<boolean> {
	try {
		await transporter.verify();
		console.log('✅ Email server connection verified');
		return true;
	} catch (error) {
		console.error('❌ Email server connection failed:', error);
		return false;
	}
}
