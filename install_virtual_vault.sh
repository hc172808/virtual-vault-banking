#!/usr/bin/env bash
set -e

REPO_SSH="git@github.com:hc172808/virtual-vault-banking.git"
APP_DIR="/opt/virtual-vault-banking"
SERVICE_NAME="virtual-vault"
NODE_VERSION="lts/*"

echo "=== Virtual Vault Banking – Production Setup (IP MODE) ==="

#--------------------------------------------
# Ask for the server IP
#--------------------------------------------
read -p "Enter your server IP address for HTTPS: " SITE_IP

#--------------------------------------------
# Install required packages
#--------------------------------------------
echo "[1/8] Installing dependencies..."
sudo apt update
sudo apt install -y git ufw curl build-essential openssl

#--------------------------------------------
# Install nvm + Node
#--------------------------------------------
echo "[2/8] Installing Node.js (nvm)..."

export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

source "$HOME/.nvm/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION

#--------------------------------------------
# Clone or update the repository
#--------------------------------------------
echo "[3/8] Cloning or updating repository..."

if [ ! -d "$APP_DIR" ]; then
    sudo git clone "$REPO_SSH" "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
else
    echo "Repository exists — updating..."
    cd "$APP_DIR"
    git pull
fi

cd "$APP_DIR"
npm install --production=false

#--------------------------------------------
# Install Caddy (reverse proxy)
#--------------------------------------------
echo "[4/8] Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --yes --dearmor -o /usr/share/keyrings/caddy.gpg
curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy.list
sudo apt update
sudo apt install -y caddy

#--------------------------------------------
# Generate self-signed SSL certificate
#--------------------------------------------
echo "[5/8] Generating self-signed certificate for IP $SITE_IP..."

SSL_DIR="/etc/caddy/self-signed"
sudo mkdir -p "$SSL_DIR"

sudo openssl req \
  -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/self.key" \
  -out "$SSL_DIR/self.crt" \
  -subj "/CN=$SITE_IP"

sudo chmod 600 "$SSL_DIR"/*

#--------------------------------------------
# Create Caddy reverse proxy configuration
#--------------------------------------------
echo "[6/8] Creating Caddy configuration..."

sudo bash -c "cat > /etc/caddy/Caddyfile" <<EOF
https://$SITE_IP {
    tls $SSL_DIR/self.crt $SSL_DIR/self.key

    reverse_proxy 127.0.0.1:3000

    respond /health "OK" 200
}
EOF

sudo systemctl restart caddy

#--------------------------------------------
# Firewall rules
#--------------------------------------------
echo "[7/8] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

#--------------------------------------------
# Create systemd service
#--------------------------------------------
echo "[8/8] Setting up systemd service..."

SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"

sudo bash -c "cat > $SERVICE_PATH" <<EOF
[Unit]
Description=Virtual Vault Banking App
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$HOME/.nvm/versions/node/*/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

#--------------------------------------------
# Create update script
#--------------------------------------------
sudo bash -c "cat > /usr/local/bin/vault-update" <<EOF
#!/usr/bin/env bash
set -e
cd $APP_DIR
echo "Pulling latest changes..."
git pull
npm install --production=false
sudo systemctl restart $SERVICE_NAME
sudo systemctl restart caddy
echo "✔ Updated successfully!"
EOF

sudo chmod +x /usr/local/bin/vault-update

echo "==============================================="
echo " ✔ Installation Complete!"
echo " Access your app at:"
echo "    https://$SITE_IP"
echo ""
echo "Commands:"
echo " - Restart app:  sudo systemctl restart $SERVICE_NAME"
echo " - View logs:    sudo journalctl -u $SERVICE_NAME -f"
echo " - Update app:   vault-update"
echo "==============================================="
