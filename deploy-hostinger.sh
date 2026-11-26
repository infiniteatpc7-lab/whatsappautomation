#!/usr/bin/env bash
set -e

APP_DIR="/home/u943120118/domains/jeniferdecor.in/public_html/wa"

# Auto-detect PHP 8.4+ binary on Hostinger (fallback to /usr/bin/php)
PHP_BIN="/usr/bin/php"
for candidate in \
  /opt/alt/php84/usr/bin/php \
  /opt/alt/php85/usr/bin/php \
  /opt/alt/php83/usr/bin/php \
  /usr/bin/php8.4 \
  /usr/bin/php84 \
  /usr/bin/php8.3 \
  /usr/bin/php83; do
  if [ -x "$candidate" ]; then
    PHP_BIN="$candidate"
    break
  fi
done

echo "Using PHP binary: $PHP_BIN ($($PHP_BIN -r 'echo PHP_VERSION;'))"

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
$PHP_BIN artisan migrate --force --no-interaction

echo "Optimizing Laravel caches..."
$PHP_BIN artisan config:clear
$PHP_BIN artisan route:clear
$PHP_BIN artisan view:clear
$PHP_BIN artisan event:clear
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache
$PHP_BIN artisan event:cache

echo "Restarting queue workers..."
$PHP_BIN artisan queue:restart || true

echo "Deployment complete! https://wa.jeniferdecor.in is live."
