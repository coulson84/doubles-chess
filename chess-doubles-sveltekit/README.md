# Chess Doubles SvelteKit App

A modern web application built with SvelteKit featuring Google OAuth authentication.

## Features

- 🔐 Google OAuth authentication using Auth.js
- 🎨 Clean, modern UI with responsive design
- ⚡ Built with SvelteKit for optimal performance
- 🔒 Secure session management
- 📱 Mobile-friendly interface

## Prerequisites

- Node.js 22.x or higher (use fnm: `fnm use 22`)
- Google OAuth credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   The `.env` file should already contain `AUTH_SECRET`. Add your Google OAuth credentials:

   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id-here
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   ```

3. **Get Google OAuth credentials:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select an existing one
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:5173/auth/callback/google`
   - Copy the Client ID and Client Secret to your `.env` file

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

## Project Structure

```
chess-doubles-sveltekit/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main landing page with auth UI
│   │   └── +page.server.ts       # Server-side session loading
│   ├── hooks.server.ts            # Auth.js configuration
│   └── app.html                   # HTML template
├── static/                        # Static assets
└── .env                          # Environment variables (not in git)
```

## How It Works

1. **Authentication Flow:**
   - Users land on the homepage in a logged-out state
   - Clicking "Sign in with Google" initiates OAuth flow
   - After successful authentication, user data is stored in session
   - The UI automatically switches to show the logged-in dashboard

2. **Session Management:**
   - Auth.js handles all authentication logic
   - Sessions are managed server-side
   - User data is securely passed to the client via `+page.server.ts`

3. **UI States:**
   - **Logged Out:** Landing page with features and sign-in button
   - **Logged In:** Dashboard with user profile, avatar, and content cards

## Building for Production

```bash
npm run build
npm run preview
```

## Technologies Used

- [SvelteKit](https://kit.svelte.dev/) - Application framework
- [Auth.js](https://authjs.dev/) - Authentication
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## License

MIT
