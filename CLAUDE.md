# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Doubles is a web application with a classic Express.js architecture using PostgreSQL database with Knex.js ORM. The application features real-time multiplayer chess with support for team-based gameplay.

## Commands

### Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build frontend with watch mode
npm run dev:frontend

# Build entire project for production
npm run build

# Build only frontend TypeScript to JavaScript
npm run build:frontend

# Build CSS with Tailwind
npm run build:css

# Type checking for all TypeScript
npm run typecheck

# Start production server (requires build first)
npm start

# Start development server without compilation
npm run start:dev

# Run tests
npm test

# Database commands
npm run migrate          # Run latest migrations
npm run migrate:make     # Create new migration
npm run migrate:rollback # Rollback last migration
npm run seed            # Run seeds
npm run seed:make       # Create new seed
```

## Architecture

### Technology Stack

- **Backend**: Express.js with TypeScript (Node.js 22+)
- **Database**: PostgreSQL with Knex.js ORM
- **Frontend**: TypeScript compiled to vanilla JavaScript via esbuild
- **Authentication**: JWT with bcrypt password hashing
- **WebSocket**: Native ws library for real-time communication
- **Build Tool**: esbuild for fast TypeScript compilation
- **Development**: Nodemon for auto-restart

### Project Structure

```
/
├── src/                    # Express backend source
│   ├── server.ts           # Main Express server
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Authentication routes
│   │   └── game.ts         # Game-related routes
│   ├── controllers/        # Business logic controllers
│   │   ├── authController.ts    # Auth logic
│   │   └── gameController.ts    # Game logic
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts         # Authentication middleware
│   │   └── errorHandler.ts # Error handling
│   ├── models/             # Database models (if needed)
│   └── db/                 # Database configuration
│       ├── knex.ts         # Knex instance
│       ├── migrations/     # Database migrations
│       └── seeds/          # Database seeds
├── frontend/               # Frontend TypeScript source
│   └── src/
│       ├── app.ts          # Main frontend application
│       ├── auth.ts         # Authentication manager
│       └── api.ts          # API service layer
├── public/                 # Static HTML/CSS files
│   └── index.html          # Main HTML page
├── dist/                   # Built frontend files
│   ├── index.html          # Copied from public/
│   └── app.js              # Compiled from frontend/src/
├── shared/                 # Shared types and utilities
│   └── types.ts            # TypeScript interfaces
├── knexfile.ts             # Knex configuration
├── tsconfig.json           # Backend TypeScript config
└── tsconfig.frontend.json  # Frontend TypeScript config
```

### Database Schema

#### Users Table
- `id` (UUID, primary key)
- `email` (string, unique)
- `username` (string, unique)
- `password_hash` (string, nullable for OAuth users)
- `google_id` (string, unique, nullable)
- `avatar_url` (string, nullable)
- `rating` (integer, default 1200)
- `games_played` (integer, default 0)
- `games_won` (integer, default 0)
- `created_at`, `updated_at` (timestamps)

#### Games Table
- `id` (UUID, primary key)
- `code` (6-character string, unique)
- `white_player_id`, `black_player_id` (user references)
- `white_partner_id`, `black_partner_id` (user references)
- `pgn` (text, nullable)
- `current_position` (JSONB)
- `status` (enum: waiting, active, completed, abandoned)
- `result` (enum: white, black, draw, null)
- `turn` (enum: white, black)
- `move_number` (integer)
- `last_move_at` (timestamp)
- `created_at`, `updated_at` (timestamps)

#### Moves Table
- `id` (UUID, primary key)
- `game_id` (game reference, cascade delete)
- `player_id` (user reference)
- `move_number` (integer)
- `from`, `to` (chess notation)
- `piece` (piece type)
- `captured`, `promotion` (nullable)
- `san` (standard algebraic notation)
- `position_after` (JSONB)
- `created_at`, `updated_at` (timestamps)

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user
- `POST /refresh` - Refresh JWT token
- `GET /google` - Google OAuth (if implemented)

#### Games (`/api/games`)
- `POST /create` - Create new game (auth required)
- `POST /join/:code` - Join game by code (auth required)
- `GET /game/:id` - Get game details
- `POST /game/:id/move` - Make a move (auth required)
- `POST /game/:id/resign` - Resign from game (auth required)
- `GET /my-games` - Get user's games (auth required)
- `GET /active` - Get active games list

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chess_doubles_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Development Workflow

### Local Development Setup

1. Install PostgreSQL and create database
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Run migrations: `npm run migrate`
5. Start development server: `npm run dev`
6. Access application at `http://localhost:3000`

### Database Management

- Create migrations: `npm run migrate:make migration_name`
- Run migrations: `npm run migrate`
- Rollback migrations: `npm run migrate:rollback`
- Create seeds: `npm run seed:make seed_name`
- Run seeds: `npm run seed`

### Authentication Flow

1. Users can register with email/username/password
2. JWT tokens are stored in HTTP-only cookies
3. Tokens include user ID, email, and username
4. Authentication middleware validates tokens on protected routes
5. Google OAuth integration available (requires configuration)

### Game Flow

1. User creates game (receives 6-character code)
2. Other users join using game code
3. Game starts when all 4 positions filled
4. Real-time moves via WebSocket or polling
5. Game state stored in PostgreSQL with move history

### Frontend Architecture

- Vanilla TypeScript compiled via esbuild
- Authentication manager handles login state
- API service layer for backend communication
- Real-time updates via WebSocket connection
- Chess board rendered with CSS Grid and Unicode pieces

### Type Safety

- Shared TypeScript interfaces in `shared/types.ts`
- Strict TypeScript configuration
- Database queries use Knex.js query builder
- Express routes with typed request/response objects
