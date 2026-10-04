#!/bin/sh
set -e

# Prepares the app on every start; all steps are safe to repeat.
[ -f .env ] || cp .env.example .env

composer install --no-interaction --prefer-dist

if ! grep -q '^APP_KEY=.\+' .env; then
    php artisan key:generate --force
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
    php artisan db:seed --force
fi

exec "$@"
