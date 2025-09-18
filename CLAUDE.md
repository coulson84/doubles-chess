# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chess Doubles is a web application with a TypeScript-based architecture using AWS Lambda for backend services and DynamoDB for data storage. The frontend communicates via HTTP APIs and WebSockets.

## Commands

### Development

```bash
# Install dependencies
npm install

# Start full development environment with Tilt (recommended)
tilt up

# Manual development commands (without Tilt):
# Start development server with hot reload
npm run dev

# Build frontend with watch mode
npm run dev:frontend

# Serve static files from dist/
npm run serve

# Build entire project
npm run build

# Build only frontend TypeScript to JavaScript
npm run build:frontend

# Build static files for S3 deployment
npm run build:static

# Type checking for all TypeScript
npm run typecheck

# Start production server
npm start

# Run tests
npm test

# Deploy Lambda functions
npm run deploy:lambda

# Deploy static files to S3 (requires S3_BUCKET_NAME env var)
npm run deploy:static
```

## Architecture

### Technology Stack

- **Runtime**: Node.js 22+ with native TypeScript support (--experimental-strip-types)
- **Frontend**: TypeScript compiled to vanilla JavaScript via esbuild
- **Backend**: AWS Lambda functions with Middy middleware
- **Database**: DynamoDB
- **WebSocket**: Native ws library for real-time communication
- **Build Tool**: esbuild for fast TypeScript compilation
- **Development**: Tilt for orchestrating multiple services
- **Deployment**: Static files to S3, Lambda functions separately

### Project Structure

```
/
├── src/              # Development server code
│   └── server.ts     # Main HTTP/WebSocket server (development only)
├── frontend/         # Frontend TypeScript source
│   └── src/
│       └── app.ts    # Main frontend application
├── public/           # Static HTML/CSS files
│   └── index.html    # Main HTML page
├── dist/             # Built frontend files (S3 deployment)
│   ├── index.html    # Copied from public/
│   └── app.js        # Compiled from frontend/src/
├── lambdas/          # AWS Lambda functions
│   ├── game-handler.ts   # Game logic handler
│   └── auth-handler.ts   # Authentication handler
├── shared/           # Shared types and utilities
│   ├── types.ts          # TypeScript interfaces
│   └── auth-middleware.ts # Middy auth middleware
├── scripts/          # Build and deployment scripts
│   ├── build.ts      # Full project build
│   └── dev-build.ts  # Development build with watch
├── esbuild.config.ts # Frontend build configuration
├── tsconfig.json     # Main TypeScript config
├── tsconfig.frontend.json # Frontend-specific TypeScript config
└── Tiltfile          # Development environment orchestration
```

### TypeScript Configuration

- **Backend**: Node.js 22+ with `--experimental-strip-types` flag (no compilation needed)
- **Frontend**: TypeScript compiled to JavaScript via esbuild
- **Type Checking**: Separate configs for backend (`tsconfig.json`) and frontend (`tsconfig.frontend.json`)
- **Build Process**: esbuild bundles frontend TypeScript into single `app.js` file
- **Development**: Watch mode available for both backend and frontend

### Lambda Functions Architecture

Each Lambda function uses Middy middleware for:

- **@middy/http-json-body-parser**: Parse JSON request bodies
- **@middy/http-error-handler**: Handle errors gracefully
- **@middy/http-cors**: CORS headers management
- **@middy/validator**: Input validation with JSON schemas
- **@middy/input-output-logger**: Request/response logging
- Custom auth middleware in `shared/auth-middleware.ts`

### DynamoDB Tables

- **chess-doubles-users**: User accounts and statistics
- **chess-doubles-games**: Game state and history

### API Endpoints

- `/api/*` - Proxies to Lambda functions
- WebSocket connections for real-time game updates

## Development Workflow

### Running Locally with Tilt (Recommended)

1. Start the development environment: `tilt up`
2. Open Tilt UI in browser (usually opens automatically)
3. Access services:
   - **Frontend (Static)**: http://localhost:3001
   - **Backend (Dev)**: http://localhost:3000
4. All file changes are watched automatically
5. Use Tilt UI to trigger manual resources like type checking

### Manual Development (Alternative)

1. Start the development server: `npm run dev`
2. In a separate terminal, build frontend with watch: `npm run dev:frontend`
3. In a third terminal, serve static files: `npm run serve`
4. Access the application at `http://localhost:3000` (backend) or `http://localhost:3001` (static)

### Static Deployment (S3)

1. Build static files: `npm run build:static`
2. Deploy to S3: `npm run deploy:static` (requires `S3_BUCKET_NAME` environment variable)
3. The `dist/` directory contains all files needed for static hosting

### Adding New Lambda Functions

1. Create new handler in `lambdas/` directory
2. Use Middy middleware stack for consistency
3. Add appropriate input validation schemas
4. Include auth middleware where needed

### Tilt Development Environment

The Tiltfile orchestrates the following services:

- **Frontend Build**: Initial TypeScript compilation
- **Frontend Watch**: Continuous rebuild on file changes
- **Static Server**: Serves built files on port 3001
- **Backend Server**: Development server with hot reload on port 3000
- **Type Checking**: Manual trigger for full type validation
- **Lambda Functions**: Ready for local testing

Use `tilt up` to start all services simultaneously with automatic file watching.

### Type Safety

- All Lambda handlers use AWS Lambda types
- Shared types in `shared/types.ts`
- Strict TypeScript configuration enabled
