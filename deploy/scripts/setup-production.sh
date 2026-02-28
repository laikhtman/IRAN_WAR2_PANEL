#!/bin/bash
set -e

echo "[1/6] Tearing down old app..."
# Stop and disable anything running on port 3001
OLD_API_PIDS=$(lsof -t -i:3001 || true)
if [ ! -z "$OLD_API_PIDS" ]; then
    kill -9 $OLD_API_PIDS || true
fi
# Disable PM2 if it exists
if command -v pm2 &> /dev/null; then
    pm2 stop all || true
    pm2 delete all || true
fi

echo "[2/6] Setting up project directory..."
APP_DIR="/opt/iran-panel-production"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
    git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git $APP_DIR
fi

cd $APP_DIR
# Reset any local changes and pull the latest from the main branch
git fetch origin
git reset --hard origin/main

echo "[3/6] Setting up .env file..."
# Read production DB password from environment, default to strong pass
DB_PASS=${DB_PASSWORD:-"warpanel_strongpass_prod"}

sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='war_panel_user'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER war_panel_user WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='war_panel'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE war_panel OWNER war_panel_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE war_panel TO war_panel_user;"

if [ -f "/root/prod.env" ]; then
    cp /root/prod.env $APP_DIR/.env
elif [ ! -f "$APP_DIR/.env" ]; then
    echo "Warning: No .env file found. Creating a template..."
    cat > $APP_DIR/.env << EOL
DATABASE_URL=postgresql://war_panel_user:${DB_PASS}@localhost:5432/war_panel
PORT=5000
PROXY_BASE_URL=http://100.81.32.3:3080
# REDACTED API KEYS - POPULATE MANUALLY OR COPY VIA SCP
OPENAI_API_KEY=
RSSAPP_API_KEY=
RSSAPP_API_SECRET=
EOL
fi

echo "[4/6] Building application..."
npm ci
npm run build
# Push schema to the database
npm run db:push

echo "[5/6] Installing and starting systemd service..."
cp deploy/production/iran-panel-production.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iran-panel-production.service

echo "[6/6] Updating Nginx..."
cp deploy/production/intelhq.io.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/intelhq.io.conf /etc/nginx/sites-enabled/
systemctl reload nginx

echo "Production Deployment complete!"
