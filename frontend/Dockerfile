FROM node:24-alpine

# The container runs as the host user (see docker-compose.yml); keep caches writable for it.
ENV HOME=/tmp npm_config_cache=/tmp/.npm

# The node_modules named volume inherits this ownership when first created.
RUN mkdir -p /app/node_modules && chown 1000:1000 /app /app/node_modules
WORKDIR /app

EXPOSE 3000

# Installs dependencies when the node_modules volume is empty, then starts the dev server.
CMD ["sh", "-c", "[ -d node_modules/next ] || npm ci; npm run dev -- --hostname 0.0.0.0"]
