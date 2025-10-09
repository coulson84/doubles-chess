# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Doubles is a web application built with SvelteKit featuring Google OAuth authentication. The app provides a secure authentication flow with a clean, modern user interface that adapts based on the user's login state.

## Architecture

### Technology Stack

- **Framework**: SvelteKit (latest) with TypeScript
- **Authentication**: Auth.js (formerly NextAuth.js) with Google OAuth provider
- **Database**: PostgreSQL with Knex.js for query building and migrations
- **Build Tool**: Vite
- **Node Version**: 22.x (managed via fnm)
- **Styling**: Scoped CSS within Svelte components

### Project Structure

```
chess-doubles-sveltekit/
├── src/
│   ├── routes/
│   │   ├── auth/
│   │   │   └── [...auth]/
│   │   │       └── +server.ts    # Auth.js API route handler (GET/POST)
│   │   ├── +page.svelte          # Main landing page with auth UI
│   │   ├── +page.server.ts       # Server-side session loading
│   │   └── +layout.svelte        # Root layout component
│   ├── hooks.server.ts            # Auth.js server hooks for session access
│   └── app.html                   # HTML template with %sveltekit.head% and %sveltekit.body%
├── db/
│   ├── migrations/                # Knex database migrations
│   │   └── 2025-10-09T13:32:12.09-Initial-basic-auth.js  # Auth tables
│   └── seeds/                     # Database seed files
├── static/                        # Static assets (favicon, etc.)
├── .env                          # Environment variables (not in git)
├── .env.example                  # Template for environment variables
├── knexfile.js                   # Knex configuration for all environments
├── package.json                  # Dependencies and scripts
├── svelte.config.js              # Svelte configuration
├── vite.config.ts                # Vite configuration
└── tsconfig.json                 # TypeScript configuration
```

## Key Features

### Authentication Flow

1. **Logged-Out State** (Default):

   - Landing page with welcome message and feature highlights
   - "Sign in with Google" button using Auth.js SignIn component
   - Responsive grid layout showcasing app benefits

2. **Logged-In State**:
   - Personalized welcome message with user's name
   - User avatar displayed from Google profile
   - User profile card showing name and email
   - Dashboard with interactive content cards (Analytics, Settings, Content)
   - "Sign Out" button using Auth.js SignOut component

### Session Management

- Auth.js handles all authentication logic server-side
- Sessions are securely managed with encrypted cookies
- User data is loaded in `+page.server.ts` and passed to client via `PageData`
- No sensitive credentials stored on client side

### Database Architecture

- **PostgreSQL** database for persistent user data
- **Knex.js** for query building and schema migrations
- **Auth.js Database Adapter** (@auth/pg-adapter) for storing sessions, accounts, and users
- **Migration System**: Versioned database changes in `db/migrations/`

#### Database Tables

1. **users** - User profile information (id, name, email, emailVerified, image)
2. **accounts** - OAuth provider account data (linked to users)
3. **sessions** - Active user sessions with expiration
4. **verification_token** - Email verification tokens (composite primary key)

## Essential Commands

### Development

```bash
# Install dependencies (requires Node 22.x)
npm install

# Start development server
npm run dev

# Start with auto-open browser
npm run dev -- --open
```

### Building

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Type Checking

```bash
# Run type checking
npm run check

# Run type checking in watch mode
npm run check:watch
```

### Database Management

```bash
# Run migrations (create/update database schema)
npx knex migrate:latest

# Rollback last migration
npx knex migrate:rollback

# Check migration status
npx knex migrate:status

# Create new migration
npx knex migrate:make migration_name

# Run seeds (populate database with test data)
npx knex seed:run
```

## Environment Variables

### Required Variables

**Authentication**

- `AUTH_SECRET`: Secret key for signing/encrypting sessions (auto-generated via `npx auth secret`)
- `GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: OAuth client secret from Google Cloud Console

**Database**

- `DB_NAME`: PostgreSQL database name
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5173/auth/callback/google`
6. Copy Client ID and Client Secret to `.env` file

## Code Conventions

### File Naming

- **`+page.svelte`**: Route page components
- **`+page.server.ts`**: Server-side load functions for pages
- **`+layout.svelte`**: Layout components that wrap pages
- **`hooks.server.ts`**: Server hooks that run on every request

### Svelte/SvelteKit Patterns

- Use `<script lang="ts">` for TypeScript in Svelte components
- Export `let data: PageData` to receive data from server load functions
- Use reactive statements with `$:` for derived values
- Scoped styles within `<style>` tags (component-scoped by default)
- Use `:global()` selector for global styles (e.g., styling Auth.js components)

### TypeScript

- Strict TypeScript enabled across the project
- Auto-generated types in `.svelte-kit/types/` directory
- Import types from `'./$types'` for route-specific types (e.g., `PageData`, `PageServerLoad`)

### Database Patterns

- Use Knex.js for all database queries (avoid raw SQL when possible)
- Migrations use JavaScript files in `db/migrations/` directory
- Migration naming: `YYYYMMDDTHHmmss-description.js`
- Always include both `up` and `down` functions in migrations
- Use `table.increments('id').primary()` for auto-incrementing primary keys
- Use `table.timestamp()` for timestamp columns (maps to PostgreSQL TIMESTAMPTZ)

### Authentication Patterns

- Use `event.locals.auth()` in server code to get session
- Pass session data to client via `return { session }`
- Check `session?.user` to determine if user is logged in
- Use Auth.js components: `<SignIn>` and `<SignOut>` for auth actions

## Important Implementation Details

### Authentication Setup

**hooks.server.ts**

- Exports the `handle` function from `SvelteKitAuth`
- Provides session access via `event.locals.auth()` on every request
- Configures providers and secrets
- This file runs on every server request

**auth/[...auth]/+server.ts**

- Exports `GET` and `POST` handlers from `SvelteKitAuth`
- Creates the actual OAuth endpoints (`/auth/signin/google`, `/auth/callback/google`, etc.)
- Must have same configuration as `hooks.server.ts`
- Handles all OAuth flows and redirects

### +page.server.ts

- Uses `PageServerLoad` type for type safety
- Calls `event.locals.auth()` to retrieve current session
- Returns session object to make it available to client

### +page.svelte

- Conditionally renders UI based on `user` existence
- Uses Svelte's `{#if user}...{:else}...{/if}` syntax
- Implements hover effects and transitions for better UX
- Responsive grid layouts that adapt to screen size

## Styling Approach

### Design System

- **Colors**:
  - Primary: `#4285f4` (Google Blue)
  - Danger: `#dc3545` (Sign Out button)
  - Neutral: Grays for text and borders
- **Typography**: System font stack for cross-platform consistency
- **Spacing**: 2rem base unit with responsive adjustments
- **Border Radius**: 8px for cards and buttons, 50% for avatar

### Responsive Design

- Grid layouts use `repeat(auto-fit, minmax(...))` for fluid responsiveness
- Mobile-first approach with sensible defaults
- Hover effects disabled on touch devices automatically

## Development Workflow

### Starting Development

1. Ensure Node 22.x is active: `fnm use 22`
2. Install dependencies if not already done: `npm install`
3. Ensure PostgreSQL is running locally
4. Create database: `createdb chess_doubles` (or your chosen DB_NAME)
5. Ensure `.env` file has all required variables (auth + database)
6. Run database migrations: `npx knex migrate:latest`
7. Run dev server: `npm run dev`
8. App available at `http://localhost:5173`

### Making Changes

- Hot module replacement (HMR) enabled for instant feedback
- Changes to `.svelte` files reload automatically
- Changes to server files may require manual refresh
- Type errors shown in terminal and IDE

### Common Development Tasks

- **Add new route**: Create `+page.svelte` in `src/routes/[route-name]/`
- **Add server logic**: Create `+page.server.ts` alongside the page
- **Add global styles**: Use `:global()` selector or create separate CSS file
- **Add protected route**: Check session in `+page.server.ts` and redirect if needed
- **Create database migration**: `npx knex migrate:make migration_name` and the convert the created file from commonjs format to esm format
- **Query database**: Import knex config and use Knex query builder
- **Add seed data**: Create seed files in `db/seeds/` and run with `npx knex seed:run`

## Deployment Considerations

### Before Deploying

- Add appropriate [SvelteKit adapter](https://svelte.dev/docs/kit/adapters) for target platform
- Update `GOOGLE_CLIENT_ID` redirect URIs to include production domain
- Generate new `AUTH_SECRET` for production (never reuse development secrets)
- Set all environment variables in hosting platform (auth + database)
- Provision PostgreSQL database for production
- Run migrations on production database: `NODE_ENV=production npx knex migrate:latest`

### Production Settings

- Build with `npm run build`
- Test production build locally with `npm run preview`
- Ensure `trustHost` setting is appropriate for production environment
- Consider adding CSRF protection and rate limiting

## Troubleshooting

### Common Issues

1. **Node version error**: Ensure Node 22.x is active (`fnm use 22`)
2. **Auth not working**: Verify all environment variables are set correctly
3. **Redirect URI mismatch**: Ensure Google Console has exact redirect URI configured
4. **Type errors**: Run `npm run check` to see all TypeScript errors
5. **Database connection error**: Verify PostgreSQL is running and credentials in `.env` are correct
6. **Migration errors**: Check `npx knex migrate:status` to see current migration state
7. **Table not found**: Run `npx knex migrate:latest` to ensure all migrations are applied

### Debug Tips

- Check browser console for client-side errors
- Check terminal output for server-side errors
- Use browser DevTools Network tab to inspect auth requests
- Verify `.env` file is in root directory and properly formatted
- Test database connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`
- Check Knex migrations table: `SELECT * FROM knex_migrations;`

## Future Enhancements

### Potential Features

- Protected routes with automatic redirects
- User profile editing
- Additional OAuth providers (GitHub, Discord, etc.)
- Role-based access control
- Email verification flow
- Game state persistence (chess games)
- Real-time multiplayer with WebSockets

### Code Quality

- Add unit tests with Vitest
- Add E2E tests with Playwright
- Set up ESLint and Prettier
- Add pre-commit hooks with Husky
- Set up CI/CD pipeline

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Auth.js SvelteKit Guide](https://authjs.dev/reference/sveltekit)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Knex.js Documentation](https://knexjs.org/guide/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
