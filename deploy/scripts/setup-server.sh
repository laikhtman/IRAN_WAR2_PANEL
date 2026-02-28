#!/bin/bash
set -e

echo "[1/6] Installing prerequisites..."
apt-get update
# Install Node.js 20 LTS if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
apt-get install -y git postgresql postgresql-contrib nginx fail2ban

echo "[2/6] Configuring PostgreSQL..."
# Start PostgreSQL if not running
systemctl enable --now postgresql

# Create database and user if they don't exist
# We use the password from the environment setup before running the script
DB_PASS=${DB_PASSWORD:-"warpanel_strongpass_123"}
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='war_panel_user'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER war_panel_user WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='war_panel_staging'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE war_panel_staging OWNER war_panel_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE war_panel_staging TO war_panel_user;"

echo "[3/6] Setting up project directory..."
APP_DIR="/opt/iran-panel-staging"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
    git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git $APP_DIR
fi

cd $APP_DIR
# Reset any local changes and pull the latest from the staging branch
git fetch origin
git reset --hard origin/deploy/staging-setup

echo "[4/6] Setting up .env file..."
# To secure credentials, .env should be copied from local or managed outside this repository script.
if [ -f "/root/staging.env" ]; then
    cp /root/staging.env $APP_DIR/.env
elif [ ! -f "$APP_DIR/.env" ]; then
    echo "Warning: No .env file found. Creating a template..."
    cat > $APP_DIR/.env << EOL
DATABASE_URL=postgresql://war_panel_user:${DB_PASS}@localhost:5432/war_panel_staging
PORT=5000
PROXY_BASE_URL=http://100.81.32.3:3080
# REDACTED API KEYS - POPULATE MANUALLY OR COPY VIA SCP
OPENAI_API_KEY=
RSSAPP_API_KEY=
RSSAPP_API_SECRET=
EOL
fi

echo "[5/6] Building application..."
npm ci
npm run build
# Push schema to the database
npm run db:push

echo "[6/6] Installing and starting systemd and nginx services..."
cp deploy/staging/iran-panel-staging.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iran-panel-staging.service

# Link staging nginx config
cp deploy/staging/staging.intelhq.io.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/staging.intelhq.io.conf /etc/nginx/sites-enabled/
systemctl reload nginx

echo "Deployment complete! App should be running on port 5000 and accessible via staging.intelhq.io if DNS is configured."
echo "You can view logs with: journalctl -u iran-panel-staging.service -f"
