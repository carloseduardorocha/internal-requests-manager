FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev \
    && docker-php-ext-install pdo_mysql intl zip pcntl bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# The container runs as the host user (see docker-compose.yml); keep caches writable for it.
ENV HOME=/tmp COMPOSER_HOME=/tmp/composer

WORKDIR /var/www/html

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
