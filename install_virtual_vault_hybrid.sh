#!/usr/bin/env bash
set -e

# === CONFIGURATION ===
APP_NAME="virtual-vault"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="$APP_NAME"
REPO_SSH="git@github.com:hc172808/virtual-vault-banking.git"
NODE_VERSION="lts/*"
SERVER_IP="192.168.18.108"
ENV_FILE="$APP_DIR/.env"

# Docker container names
POSTGRES_CONTAINER="vault-postgres"
PGADMIN_CONTAINER="vault-pgadmin"
PROM_CONTAINER="vault-prometheus"
GRAF_CONTAINER="vault-grafana"
NETWORK_NAME="vault-network"

# Fail2ban jail
JAIL_NAME="vault-app"

echo "=== Virtual Vault Banking: Hybrid Production Installer ==="

#--------------------------------------------
# 1. Update packages & install prerequisites
#--------------------------------------------
echo "[1/15] Installing base packages..."
sudo apt update
sudo apt install -y git ufw curl build-essential openssl software-properties-common apt-transport-https

#--------------------------------------------
# 2. Install Docker & Docker Compose
#--------------------------------------------
echo "[2/15] Installing Docker & Docker Compose..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose

#--------------------------------------------
# 3. Install Node.js via NVM
#--------------------------------------------
echo "[3/15] Installing Node.js..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
source "$HOME/.nvm/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION

#--------------------------------------------
# 4. Clone or update app repo
#--------------------------------------------
echo "[4/15] Cloning or updating app repository..."
if [ ! -d "$APP_DIR" ]; then
    sudo git clone "$REPO_SSH" "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
else
    cd "$APP_DIR"
    git pull
fi

cd "$APP_DIR"
npm install --production=false

#--------------------------------------------
# 5. Create .env file
#--------------------------------------------
echo "[5/15] Creating .env file..."
DB_NAME="vaultdb"
DB_USER="vaultuser"
DB_PASS=$(openssl rand -base64 24)
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@$POSTGRES_CONTAINER:5432/$DB_NAME
EOF

#--------------------------------------------
# 6. Setup Docker network
#--------------------------------------------
echo "[6/15] Creating Docker network..."
docker network create $NETWORK_NAME || true

#--------------------------------------------
# 7. PostgreSQL container
#--------------------------------------------
echo "[7/15] Deploying PostgreSQL container..."
docker run -d \
  --name $POSTGRES_CONTAINER \
  --network $NETWORK_NAME \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASS \
  -v $APP_DIR/dbdata:/var/lib/postgresql/data \
  postgres:15

#--------------------------------------------
# 8. pgAdmin 4 container
#--------------------------------------------
echo "[8/15] Deploying pgAdmin 4..."
PGADMIN_USER="admin@vault.local"
PGADMIN_PASS=$(openssl rand -base64 16)

docker run -d \
  --name $PGADMIN_CONTAINER \
  --network $NETWORK_NAME \
  -p 8080:80 \
  -e PGADMIN_DEFAULT_EMAIL=$PGADMIN_USER \
  -e PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASS \
  dpage/pgadmin4

#--------------------------------------------
# 9. Prometheus container
#--------------------------------------------
echo "[9/15] Deploying Prometheus..."
mkdir -p $APP_DIR/prometheus
cat > $APP_DIR/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']
EOF

docker run -d \
  --name $PROM_CONTAINER \
  --network $NETWORK_NAME \
  -p 9090:9090 \
  -v $APP_DIR/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

#--------------------------------------------
# 10. Grafana container
#--------------------------------------------
echo "[10/15] Deploying Grafana..."
docker run -d \
  --name $GRAF_CONTAINER \
  --network $NETWORK_NAME \
  -p 3001:3000 \
  grafana/grafana

#--------------------------------------------
# 11. Self-signed SSL & Caddy
#--------------------------------------------
echo "[11/15] Configuring Caddy & HTTPS..."
sudo apt install -y caddy

SSL_DIR="/etc/caddy/self-signed"
sudo mkdir -p "$SSL_DIR"
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/self.key" \
  -out "$SSL_DIR/self.crt" \
  -subj "/CN=$SERVER_IP"
sudo chmod 600 "$SSL_DIR"/*

sudo bash -c "cat > /etc/caddy/Caddyfile" <<EOF
https://$SERVER_IP {
    tls $SSL_DIR/self.crt $SSL_DIR/self.key
    reverse_proxy 127.0.0.1:3000
}
EOF
sudo systemctl restart caddy

#--------------------------------------------
# 12. Firewall
#--------------------------------------------
echo "[12/15] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

#--------------------------------------------
# 13. Systemd service for app
#--------------------------------------------
echo "[13/15] Creating systemd service..."
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME.service"
sudo bash -c "cat > $SERVICE_PATH" <<EOF
[Unit]
Description=Virtual Vault Banking App
After=network.target docker.service
Requires=docker.service

[Service]
User=$USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
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
# 14. Fail2ban
#--------------------------------------------
echo "[14/15] Installing Fail2ban..."
sudo apt install -y fail2ban

sudo bash -c "cat > /etc/fail2ban/jail.d/$JAIL_NAME.local" <<EOF
[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
maxretry = 5

[caddy-http-auth]
enabled = true
port    = http,https
filter  = caddy-auth
logpath = /var/log/caddy/access.log
maxretry = 5
EOF

sudo systemctl restart fail2ban

#--------------------------------------------
# 15. Backup & update scripts
#--------------------------------------------
echo "[15/15] Creating backup and update scripts..."

# Backup script
BACKUP_SCRIPT="/usr/local/bin/vault-backup"
sudo bash -c "cat > $BACKUP_SCRIPT" <<EOF
#!/usr/bin/env bash
TIMESTAMP=\$(date +'%Y%m%d_%H%M%S')
docker exec $POSTGRES_CONTAINER pg_dump -U $DB_USER $DB_NAME > $APP_DIR/db_backup_\$TIMESTAMP.sql
echo "Backup saved: db_backup_\$TIMESTAMP.sql"
EOF
sudo chmod +x $BACKUP_SCRIPT

# Update script
UPDATE_SCRIPT="/usr/local/bin/vault-update"
sudo bash -c "cat > $UPDATE_SCRIPT" <<EOF
#!/usr/bin/env bash
set -e
cd $APP_DIR
git pull
npm install --production=false
sudo systemctl restart $SERVICE_NAME
sudo systemctl restart caddy
echo "✔ Update complete!"
EOF
sudo chmod +x $UPDATE_SCRIPT

#--------------------------------------------
# Final Output
#--------------------------------------------
echo "=============================================================="
echo " ✔ Installation Complete!"
echo ""
echo "App URL (self-signed HTTPS): https://$SERVER_IP"
echo ""
echo "PostgreSQL credentials:"
echo "  DB Name: $DB_NAME"
echo "  DB User: $DB_USER"
echo "  DB Pass: $DB_PASS"
echo ""
echo "pgAdmin 4 credentials:"
echo "  URL: http://$SERVER_IP:8080"
echo "  Email: $PGADMIN_USER"
echo "  Password: $PGADMIN_PASS"
echo ""
echo "Monitoring:"
echo "  Prometheus: http://$SERVER_IP:9090"
echo "  Grafana: http://$SERVER_IP:3001"
echo ""
echo "Commands:"
echo "  App logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart app: sudo systemctl restart $SERVICE_NAME"
echo "  Update app: vault-update"
echo "  Backup DB: vault-backup"
echo "=============================================================="
