# Chess Doubles Development Environment with Tilt
# Express.js + PostgreSQL + Knex.js Architecture

# PostgreSQL Database via Docker Compose
docker_compose('docker-compose.yaml')
dc_resource('postgres', )

# Backend TypeScript compilation
local_resource(
    'backend-build',
    cmd='npm run build:backend',
    deps=['src', 'knexfile.ts', 'tsconfig.json'],
    labels=['backend']
)

# Database setup and migrations
local_resource(
    'database-setup',
    cmd='npm run migrate',
    deps=['src/db/migrations', 'knexfile.ts'],
    resource_deps=['backend-build', 'postgres'],
    labels=['database'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
    'database-seed',
    cmd='npm run seed',
    deps=['src/db/seeds'],
    resource_deps=['backend-build', 'database-setup'],
    labels=['database'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

# Tailwind CSS Build and Watch
local_resource(
    'css-build',
    cmd='npm run build:css',
    deps=['frontend/src/styles', 'tailwind.config.js'],
    labels=['frontend']
)

local_resource(
    'css-watch',
    serve_cmd='npm run build:css:watch',
    deps=['frontend/src/styles', 'frontend/src', 'public', 'tailwind.config.js'],
    resource_deps=['css-build'],
    labels=['frontend'],
    auto_init=True
)

local_resource(
    'copy-public',
    cmd='mkdir -p dist/public && cp -r public/* dist/public',
    deps=['public'],
    labels=['frontend'],
    auto_init=True,
)

# Frontend TypeScript Build and Watch
local_resource(
    'frontend-build',
    cmd='npm run build:frontend',
    deps=['frontend/src', 'shared/types.ts', 'tsconfig.frontend.json', 'esbuild.config.ts'],
    resource_deps=['css-build'],
    labels=['frontend']
)

local_resource(
    'frontend-watch',
    serve_cmd='npm run dev:frontend',
    deps=['frontend/src', 'shared/types.ts'],
    resource_deps=['frontend-build'],
    labels=['frontend'],
    auto_init=True,
    trigger_mode=TRIGGER_MODE_MANUAL
)

# Express.js Backend Server
local_resource(
    'express-server',
    serve_cmd='npm run dev',
    deps=['src', 'shared', 'knexfile.ts'],
    resource_deps=['backend-build', 'postgres'],
    labels=['backend'],
    auto_init=True,
)

# Type Checking (manual trigger)
local_resource(
    'typecheck',
    cmd='npm run typecheck',
    deps=['src', 'frontend/src', 'shared', 'tsconfig.json', 'tsconfig.frontend.json'],
    labels=['dev-tools'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

# Test Runner (manual trigger)
local_resource(
    'test',
    cmd='npm test',
    deps=['src', 'shared'],
    resource_deps=['backend-build'],
    labels=['dev-tools'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

# Database migration tools
local_resource(
    'migrate-rollback',
    cmd='npm run migrate:rollback',
    deps=['src/db/migrations'],
    resource_deps=['backend-build'],
    labels=['database'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

print("""
🎯 Chess Doubles Development Environment
Express.js + PostgreSQL + Knex.js

Services:
  🚀 Express API Server:  http://localhost:3000
  🗄️  PostgreSQL Database: localhost:5435 (auto-started via Docker)

Quick Start:
  1. Run 'tilt up' - PostgreSQL starts automatically
  2. Copy .env.example to .env (already configured for Docker)
  3. Click 'database-setup' resource to create tables
  4. Backend server auto-starts and serves both API and static files

Manual Resources (click to trigger):
  📊 typecheck         - Run TypeScript checks
  🧪 test             - Run test suite
  📋 database-setup    - Run migrations (after postgres is ready)
  🌱 database-seed     - Populate test data
  ⏪ migrate-rollback  - Rollback last migration

Development:
  - PostgreSQL runs in Docker container (persistent data)
  - Express server serves frontend at /
  - API endpoints at /api/*
  - Auto-restart on backend changes
  - Frontend rebuild on changes

Database Info:
  - Host: localhost:5435
  - Database: chess_doubles_dev
  - User/Pass: postgres/postgres
""")

# Resource grouping configuration
config.define_string("database_url")
cfg = config.parse()

if cfg.get("database_url"):
    print("📌 Using custom database URL: " + cfg.get("database_url"))