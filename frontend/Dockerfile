FROM node:24-alpine

RUN apk add --no-cache su-exec

# The entrypoint drops privileges to the owner of the code; keep caches writable for any user.
ENV HOME=/tmp npm_config_cache=/tmp/.npm

WORKDIR /app

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
