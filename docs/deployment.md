# Production Deployment

Guide for deploying the War Panel to a production server. The reference deployment uses a Hetzner VPS running Ubuntu 22.04.

## Architecture

```
Internet → Cloudflare → Nginx (SSL) → Node.js (:5000) → PostgreSQL
                                            ↕
                              Tailscale VPN → Proxy (Israeli IP)
```

## Prerequisites

- Ubuntu 22.04 VPS (recommended: 2 vCPU, 4GB RAM — e.g., Hetzner CX21)
- Domain name pointing to the VPS IP
- SSL certificate (Cloudflare Origin cert or Let's Encrypt)

## Automated Deployment

Two scripts handle the full setup:

### 1. Initial Server Setup (`deploy/scripts/setup-server.sh`)

Run once on a fresh VPS. Installs:
- Node.js 20 (NodeSource PPA)
- PostgreSQL + creates `war_panel` database and `war_panel_user`
- Nginx
- fail2ban
- Git

```bash
# On the VPS as root
chmod +x deploy/scripts/setup-server.sh
DB_PASSWORD="your-strong-password" ./deploy/scripts/setup-server.sh
```

### 2. Production Deployment (`deploy/scripts/setup-production.sh`)

Run for initial deploy and subsequent updates:

```bash
chmod +x deploy/scripts/setup-production.sh
DB_PASSWORD="your-strong-password" ./deploy/scripts/setup-production.sh
```

This script:
1. Stops any existing processes on port 3001 and PM2
2. Clones (or updates) repo to `/opt/iran-panel-production`
3. Creates PostgreSQL user/database if needed
4. Copies `.env` from `/root/prod.env` (or creates template)
5. Runs `npm ci && npm run build && npm run db:push`
6. Installs systemd service
7. Updates Nginx config and reloads

## Manual Deployment Steps

### Step 1: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### Step 2: Install PostgreSQL

```bash
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

sudo -u postgres psql -c "CREATE USER war_panel_user WITH PASSWORD 'your-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE war_panel OWNER war_panel_user;"
```

### Step 3: Clone and Build

```bash
mkdir -p /opt/iran-panel-production
cd /opt/iran-panel-production
git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git .
npm ci
npm run build
npm run db:push
```

### Step 4: Configure Environment

```bash
# Copy your production env file
scp local-machine:/path/to/prod.env /opt/iran-panel-production/.env

# Or create manually:
cat > /opt/iran-panel-production/.env << 'EOF'
DATABASE_URL=postgresql://war_panel_user:your-strong-password@localhost:5432/war_panel
PORT=5000
OPENAI_API_KEY=sk-...
PROXY_BASE_URL=http://100.81.32.3:3080
PROXY_AUTH_TOKEN=your-proxy-token
RSSAPP_API_KEY=...
RSSAPP_API_SECRET=...
EOF
```

### Step 5: Install systemd Service

The service file is at `deploy/production/iran-panel-production.service`:

```ini
[Unit]
Description=IRAN WAR2 PANEL (Production)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/iran-panel-production
EnvironmentFile=/opt/iran-panel-production/.env
ExecStart=/usr/bin/node dist/index.cjs
Restart=on-failure
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=iran-panel-prod

[Install]
WantedBy=multi-user.target
```

Install and start:
```bash
cp deploy/production/iran-panel-production.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now iran-panel-production
systemctl status iran-panel-production
```

### Step 6: Configure Nginx

The Nginx config is at `deploy/production/intelhq.io.conf`:

```bash
cp deploy/production/intelhq.io.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/intelhq.io.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Key features of the Nginx config:
- SSL termination (TLS 1.2/1.3)
- WebSocket upgrade support (`Upgrade` and `Connection` headers)
- Gzip compression for text/JSON/JS/CSS
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Proxy pass to `http://127.0.0.1:5000`

### Step 7: SSL Certificate

**Option A: Cloudflare Origin Certificate** (used in production)
```bash
# Place cert files:
/etc/ssl/certs/intelhq-origin.crt
/etc/ssl/private/intelhq-origin.key
```

**Option B: Let's Encrypt**
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d intelhq.io -d www.intelhq.io
```

### Step 8: Firewall

```bash
apt-get install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Step 9: Tailscale VPN (for Oref alerts)

Required if you want real-time Pikud HaOref alerts:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# Note the Tailscale IP of the proxy server
# Set PROXY_BASE_URL=http://<tailscale-ip>:3080 in .env
```

## Updating Production

```bash
cd /opt/iran-panel-production
git fetch origin
git reset --hard origin/main
npm ci
npm run build
npm run db:push
systemctl restart iran-panel-production
```

## Staging Environment

A staging setup exists at `/opt/iran-panel-staging` using `deploy/scripts/setup-server.sh`. It uses a separate database (`war_panel_staging`) and can be configured with its own `.env`.
