# Chess Doubles Development Environment with Tilt

# Frontend TypeScript Build and Watch
local_resource(
    'frontend-build',
    cmd='npm run build:frontend',
    deps=['frontend/src', 'shared/types.ts', 'tsconfig.frontend.json', 'esbuild.config.ts'],
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

# Static File Server for Frontend
local_resource(
    'static-server',
    serve_cmd='npm run serve',
    deps=['dist'],
    resource_deps=['frontend-build'],
    labels=['frontend'],
    auto_init=True
)

# Backend Development Server
local_resource(
    'backend-server',
    serve_cmd='npm run dev',
    deps=['src', 'shared'],
    labels=['backend'],
    auto_init=True
)

# Type Checking (runs on file changes)
local_resource(
    'typecheck',
    cmd='npm run typecheck',
    deps=['src', 'frontend/src', 'lambdas', 'shared', 'tsconfig.json', 'tsconfig.frontend.json'],
    labels=['dev-tools'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL
)

# Lambda Functions (for local testing/development)
local_resource(
    'lambda-functions',
    cmd='echo "Lambda functions ready for local testing"',
    deps=['lambdas', 'shared'],
    labels=['backend'],
    auto_init=False
)

print("""
🎯 Chess Doubles Development Environment

Services:
  🎮 Frontend (Static): http://localhost:3001
  🚀 Backend (Dev):     http://localhost:3000

Commands:
  - Press 'space' to open Tilt UI in browser
  - Use Tilt UI to trigger manual resources
  - All file changes are watched automatically

Frontend: TypeScript → JavaScript compilation with esbuild
Backend:  Node.js with --experimental-strip-types hot reload
""")

# Resource grouping for better organization
def set_resource_labels():
    """Organize resources by labels for better UX"""
    pass