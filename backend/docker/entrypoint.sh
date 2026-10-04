#!/bin/sh
set -e

# Starts as root and drops to the owner of the mounted code, so files created in
# the repository (.env, vendor, make:* output) belong to the host user.
if [ "$(id -u)" = "0" ]; then
    uid=$(stat -c %u .)
    gid=$(stat -c %g .)
    if [ "$uid" != "0" ]; then
        exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$0" "$@"
    fi
fi

# Prepares the app on every start; all steps are safe to repeat.
[ -f .env ] || cp .env.example .env

# The worker waits for the api to be healthy, so vendor/ already exists.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=.\+' .env; then
    php artisan key:generate --force
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
    php artisan db:seed --force
fi

exec "$@"
