# Tiltfile for game development environment

# Load the docker-compose.yaml file to manage PostgreSQL and MailDev
docker_compose('./docker-compose.yaml')

# Define resources for the docker-compose services
dc_resource('postgres', labels=['infrastructure'])
dc_resource('maildev', labels=['infrastructure'])

# Run the SvelteKit dev server
local_resource(
  'game-sveltekit',
  serve_cmd='cd game-sveltekit && npm run dev',
  labels=['app'],
  links=[
    link('http://localhost:5173', 'SvelteKit App'),
  ],
  readiness_probe=probe(
    http_get=http_get_action(port=5173, path='/'),
  ),
)

# Add helpful links for infrastructure services
dc_resource('postgres',
  links=[
    link('postgres://postgres:postgres@localhost:5435/game_dev', 'PostgreSQL Connection'),
  ]
)

dc_resource('maildev',
  links=[
    link('http://localhost:1080', 'MailDev Web UI'),
  ]
)
