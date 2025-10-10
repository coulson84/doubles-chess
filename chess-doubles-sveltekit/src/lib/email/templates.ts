export interface SignupConfirmationData {
	name: string;
	email: string;
	verificationUrl: string;
}

export interface GameInviteEmailData {
	recipientName: string;
	inviterName: string;
	gameId: string;
	gameUrl: string;
}

export function signupConfirmationEmail(data: SignupConfirmationData): { subject: string; html: string; text: string } {
	const { name, email, verificationUrl } = data;

	const subject = 'Welcome to Chess Doubles - Verify Your Email';

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome to Chess Doubles</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0;">♟️ Chess Doubles</h1>
	</div>

	<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
		<h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>

		<p>Thank you for signing up for Chess Doubles. We're excited to have you join our community!</p>

		<p>To complete your registration and verify your email address, please click the button below:</p>

		<div style="text-align: center; margin: 30px 0;">
			<a href="${verificationUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email Address</a>
		</div>

		<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
		<p style="background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #667eea;">${verificationUrl}</p>

		<p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't create an account with Chess Doubles, you can safely ignore this email.</p>

		<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

		<p style="color: #999; font-size: 12px; text-align: center;">
			Chess Doubles &copy; ${new Date().getFullYear()}<br>
			This email was sent to ${email}
		</p>
	</div>
</body>
</html>
	`;

	const text = `
Welcome to Chess Doubles!

Hi ${name},

Thank you for signing up for Chess Doubles. We're excited to have you join our community!

To complete your registration and verify your email address, please visit:

${verificationUrl}

If you didn't create an account with Chess Doubles, you can safely ignore this email.

---
Chess Doubles © ${new Date().getFullYear()}
This email was sent to ${email}
	`;

	return { subject, html, text };
}

export function gameInviteEmail(data: GameInviteEmailData): { subject: string; html: string; text: string } {
	const { recipientName, inviterName, gameId, gameUrl } = data;

	const subject = `${inviterName} invited you to play Chess Doubles`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Game Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
		<h1 style="color: white; margin: 0;">♟️ Chess Doubles</h1>
	</div>

	<div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
		<h2 style="color: #333; margin-top: 0;">You're Invited to Play!</h2>

		<p>Hi ${recipientName},</p>

		<p><strong>${inviterName}</strong> has invited you to join a Chess Doubles game.</p>

		<div style="text-align: center; margin: 30px 0;">
			<a href="${gameUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Join Game</a>
		</div>

		<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
		<p style="background: white; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #667eea;">${gameUrl}</p>

		<p style="color: #666; font-size: 14px; margin-top: 30px;">Game ID: <code style="background: white; padding: 4px 8px; border-radius: 4px;">${gameId}</code></p>

		<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

		<p style="color: #999; font-size: 12px; text-align: center;">
			Chess Doubles &copy; ${new Date().getFullYear()}
		</p>
	</div>
</body>
</html>
	`;

	const text = `
You're Invited to Play Chess Doubles!

Hi ${recipientName},

${inviterName} has invited you to join a Chess Doubles game.

Join the game here:
${gameUrl}

Game ID: ${gameId}

---
Chess Doubles © ${new Date().getFullYear()}
	`;

	return { subject, html, text };
}
