#!/usr/bin/env bash
set -e

echo "=== Web Helper VPS Installer ==="
read -p "Domain (contoh: helper.domainkamu.com): " APP_DOMAIN
read -p "Port aplikasi [3000]: " APP_PORT
APP_PORT=${APP_PORT:-3000}
read -p "Pasang HTTPS otomatis dengan certbot? (y/n) [y]: " USE_CERTBOT
USE_CERTBOT=${USE_CERTBOT:-y}

APP_DIR=$(pwd)

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js tidak ditemukan. Silakan install Node.js v24 terlebih dahulu."
  exit 1
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "File .env dibuat dari .env.example. Isi GEMINI_API_KEY_1, dst sebelum melanjutkan."
fi

echo "Menginstall dependency npm..."
npm install --omit=dev

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Menginstall pm2 secara global..."
  npm install -g pm2
fi

PORT=$APP_PORT pm2 start machine-api/server.js --name web-helper --update-env
pm2 save

if command -v nginx >/dev/null 2>&1; then
  echo "Menulis konfigurasi nginx untuk $APP_DOMAIN..."
  NGINX_CONF="/etc/nginx/sites-available/web-helper"
  sudo tee "$NGINX_CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name $APP_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/web-helper
  sudo nginx -t && sudo systemctl reload nginx

  if [ "$USE_CERTBOT" = "y" ] && command -v certbot >/dev/null 2>&1; then
    sudo certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos -m admin@"$APP_DOMAIN" || true
  fi
else
  echo "nginx tidak ditemukan, lewati konfigurasi reverse proxy. Aplikasi tetap jalan di port $APP_PORT lewat pm2."
fi

echo "=== Selesai ==="
echo "Aplikasi berjalan lewat pm2 dengan nama 'web-helper' di port $APP_PORT."
echo "Cek status: pm2 status"
echo "Lihat log:  pm2 logs web-helper"
