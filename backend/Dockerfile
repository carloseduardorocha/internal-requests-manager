FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev \
    && docker-php-ext-install pdo_mysql intl zip pcntl bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# The entrypoint drops privileges to the owner of the code; keep caches writable for any user.
ENV HOME=/tmp COMPOSER_HOME=/tmp/composer

WORKDIR /var/www/html

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
# Not artisan serve nor the framework's server.php: both print a text line per request, which breaks the JSON-only logs.
CMD ["php", "-q", "-S", "0.0.0.0:8000", "-t", "public", "docker/server.php"]
