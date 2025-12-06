#!/bin/bash
# setup_virtual_vault_multi_node_ssl_with_update.sh
# Fully automated, secure multi-node setup for Virtual Vault Banking on Ubuntu
# Includes robust Node.js LTS installation and update prompt if project exists

set -e

# -------------------------------
# Configuration
# -------------------------------
REPO_URL="git@github.com:hc172808/virtual-vault-banking.git"
PROJECT_DIR="/opt/virtual-vault-banking"
ADMIN_UPDATE_FILE="/opt/admin_pull_update.sh"
APP_PORT=3000
DOMAIN="yourdomain.com"      # <- Replace with your real domain
SSH_PORT=22                  # <- Change if needed
ADMIN_USER="projectadmin"
LITE_COUNT=2                 # Number of lite nodes
LITE_BASE_PORT=3001

# -------------------------------
# Helper Functions
# -------------------------------

install_dependencies() {
    echo "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential ufw fail2ban nginx certbot python3-certbot-nginx
}

install_node() {
    if ! command -v node >/dev/null 2>&1; then
        echo "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    fi

    # Load nvm for current session
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    # Robust latest LTS detection
    LATEST_LTS=$(nvm ls-remote --lts | grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
    echo "Latest Node.js LTS detected: $LATEST_LTS"

    nvm install "$LATEST_LTS"
    nvm use "$LATEST_LTS"
}

setup_project() {
    if [ -d "$PROJECT_DIR" ]; then
        echo "Project directory '$PROJECT_DIR' already exists."
        read -p "Do you want to update it? (y/n): " update_choice
        if [[ "$update_choice" =~ ^[Yy]$ ]]; then
            echo "Pulling latest changes..."
            cd "$PROJECT_DIR"
            git pull origin main
            npm install
            npm run build
            echo "Project updated."
        else
            echo "Skipping project update."
        fi
    else
        echo "Cloning full node repository..."
        git clone "$REPO_URL" "$PROJECT_DIR"
        sudo chown -R $USER:$USER "$PROJECT_DIR"
    fi
}

install_node_modules() {
    echo "Installing Node.js dependencies..."
    cd "$PROJECT_DIR"
    npm install
}

build_project() {
    echo "Building full node for production..."
    cd "$PROJECT_DIR"
    npm run build
}

setup_admin_update_file() {
    echo "Creating admin update script..."
    cat << 'EOF' | sudo tee "$ADMIN_UPDATE_FILE"
#!/bin/bash
# Pull latest changes and rebuild full + lite nodes

# Full node
cd /opt/virtual-vault-banking
git pull origin main
npm install
npm run build

# Lite nodes
for i in 1 2; do
    LITE_DIR="/opt/virtual-vault-lite-$i"
    cd $LITE_DIR
    git pull origin main
    npm install
    npm run build
done

echo "Update complete for full and lite nodes."
EOF
    sudo chmod +x "$ADMIN_UPDATE_FILE"
    echo "Admin update script ready at $ADMIN_UPDATE_FILE"
}

install_serve() {
    if ! command -v serve >/dev/null 2>&1; then
        echo "Installing serve globally..."
        npm install -g serve
    fi
}

configure_firewall() {
    echo "Configuring UFW firewall..."
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow $SSH_PORT/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw enable
    sudo ufw status verbose
}

configure_fail2ban() {
    echo "Configuring Fail2Ban..."
    sudo bash -c 'cat > /etc/fail2ban/jail.local <<EOL
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = '"$SSH_PORT"'
logpath = /var/log/auth.log
maxretry = 5
EOL'
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
}

setup_admin_user() {
    echo "Creating dedicated admin user '$ADMIN_USER'..."
    sudo adduser --gecos "" $ADMIN_USER || true
    sudo usermod -aG sudo $ADMIN_USER
}

harden_ssh() {
    echo "Hardening SSH..."
    sudo sed -i "s/#Port 22/Port $SSH_PORT/" /etc/ssh/sshd_config
    sudo sed -i "s/PermitRootLogin yes/PermitRootLogin no/" /etc/ssh/sshd_config
    sudo sed -i "s/#PasswordAuthentication yes/PasswordAuthentication no/" /etc/ssh/sshd_config
    sudo systemctl restart ssh
}

enable_auto_updates() {
    echo "Enabling automatic security updates..."
    sudo apt install -y unattended-upgrades
    sudo dpkg-reconfigure --priority=low unattended-upgrades
}

configure_nginx_full_node() {
    echo "Removing default Nginx page..."
    sudo rm -f /etc/nginx/sites-enabled/default

    echo "Configuring Nginx for full node..."
    sudo bash -c "cat > /etc/nginx/sites-available/virtual-vault <<EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL"
    sudo ln -sf /etc/nginx/sites-available/virtual-vault /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

    echo "Obtaining SSL certificate for full node..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
}

setup_systemd_service() {
    echo "Setting up systemd service for full node..."
    sudo bash -c "cat > /etc/systemd/system/virtual-vault.service <<EOL
[Unit]
Description=Virtual Vault Banking Full Node
After=network.target

[Service]
Type=simple
User=$ADMIN_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/npx serve -s dist -l $APP_PORT
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL"
    sudo systemctl daemon-reload
    sudo systemctl enable virtual-vault
    sudo systemctl start virtual-vault
}

setup_lite_nodes() {
    for i in $(seq 1 $LITE_COUNT); do
        NODE_PORT=$((LITE_BASE_PORT + i - 1))
        LITE_DIR="/opt/virtual-vault-lite-$i"
        SERVICE_NAME="virtual-vault-lite-$i"

        echo "Setting up lite node $i on port $NODE_PORT..."
        if [ ! -d "$LITE_DIR" ]; then
            sudo cp -r "$PROJECT_DIR" "$LITE_DIR"
            sudo chown -R $ADMIN_USER:$ADMIN_USER "$LITE_DIR"
        fi

        cd "$LITE_DIR"
        npm install
        npm run build

        # systemd service
        sudo bash -c "cat > /etc/systemd/system/$SERVICE_NAME.service <<EOL
[Unit]
Description=Virtual Vault Banking Lite Node $i
After=network.target

[Service]
Type=simple
User=$ADMIN_USER
WorkingDirectory=$LITE_DIR
ExecStart=/usr/bin/npx serve -s dist -l $NODE_PORT
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL"

        sudo systemctl daemon-reload
        sudo systemctl enable $SERVICE_NAME
        sudo systemctl start $SERVICE_NAME

        # Nginx config for lite node subdomain
        sudo bash -c "cat > /etc/nginx/sites-available/lite-$i <<EOL
server {
    listen 80;
    server_name lite$i.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$NODE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL"
        sudo ln -sf /etc/nginx/sites-available/lite-$i /etc/nginx/sites-enabled/
        sudo nginx -t
    done

    sudo systemctl restart nginx

    # SSL for lite nodes
    for i in $(seq 1 $LITE_COUNT); do
        sudo certbot --nginx -d lite$i.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || true
    done
}

# -------------------------------
# Main Execution
# -------------------------------
install_dependencies
install_node
setup_project
install_node_modules
build_project
setup_admin_update_file
install_serve
configure_firewall
configure_fail2ban
setup_admin_user
harden_ssh
enable_auto_updates
configure_nginx_full_node
setup_systemd_service
setup_lite_nodes

echo "--------------------------------------"
echo "Multi-node setup complete!"
echo "Full node: https://$DOMAIN"
for i in $(seq 1 $LITE_COUNT); do
    echo "Lite node $i: https://lite$i.$DOMAIN"
done
echo "Admin update script: sudo $ADMIN_UPDATE_FILE"
echo "Full node logs: sudo journalctl -u virtual-vault -f"
for i in $(seq 1 $LITE_COUNT); do
    echo "Lite node $i logs: sudo journalctl -u virtual-vault-lite-$i -f"
done
echo "--------------------------------------"
