#!/bin/bash
# Setup script for the Israeli proxy server
# Run this on your server at 195.20.17.179

echo "=== War Panel Proxy Server Setup ==="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"

# Create directory
PROXY_DIR="$HOME/war-panel-proxy"
mkdir -p "$PROXY_DIR"
cp index.js "$PROXY_DIR/"

# Generate auth token
AUTH_TOKEN=$(openssl rand -hex 32)
echo "PROXY_AUTH_TOKEN=$AUTH_TOKEN" > "$PROXY_DIR/.env"
echo "PROXY_PORT=3128" >> "$PROXY_DIR/.env"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Auth token generated: $AUTH_TOKEN"
echo "Save this token — you'll need to set it as PROXY_AUTH_TOKEN in your .env file."
echo ""
echo "To start the proxy:"
echo "  cd $PROXY_DIR"
echo "  export \$(cat .env | xargs) && node index.js"
echo ""
echo "To run in background with auto-restart (using systemd):"
echo "  sudo cp war-panel-proxy.service /etc/systemd/system/"
echo "  sudo systemctl enable war-panel-proxy"
echo "  sudo systemctl start war-panel-proxy"
echo ""
echo "Or use pm2:"
echo "  npm install -g pm2"
echo "  cd $PROXY_DIR && export \$(cat .env | xargs) && pm2 start index.js --name war-panel-proxy"
echo "  pm2 save && pm2 startup"
