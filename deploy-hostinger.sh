#!/usr/bin/env bash
set -e

APP_DIR="/home/u943120118/domains/jeniferdecor.in/public_html/wa"
PHP_BIN="/usr/bin/php"

cd "$APP_DIR"

echo "Ensuring storage & cache directories exist..."
mkdir -p storage/app/public \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  bootstrap/cache

chmod -R 775 storage bootstrap/cache

if [ ! -L public/storage ]; then
  $PHP_BIN artisan storage:link || true
fi

echo "Running database migrations..."
$PHP_BIN artisan migrate --force

echo "Optimizing Laravel caches..."
$PHP_BIN artisan config:clear
$PHP_BIN artisan route:clear
$PHP_BIN artisan view:clear
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache

echo "Restarting queue workers..."
$PHP_BIN artisan queue:restart || true

echo "Deployment complete for https://wa.jeniferdecor.in"
