#!/bin/bash
#===============================================================================
# Virtual Vault Banking - Production Server Setup Script
# Ubuntu 22.04+ / Debian 12+
# 
# This script sets up a complete production environment with:
# - Node.js (latest LTS via nvm)
# - Caddy web server with automatic HTTPS
# - PostgreSQL database (optional local setup)
# - Systemd service management
# - Firewall configuration
# - Fail2ban security
# - Automatic updates
# - Backup scripts
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
APP_NAME="virtual-vault-banking"
APP_DIR="/opt/${APP_NAME}"
APP_USER="vaultapp"
NODE_VERSION="20"
DOMAIN=""
SSL_EMAIL=""
ENABLE_FIREWALL="yes"
ENABLE_FAIL2BAN="yes"

# Print functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Gather configuration
gather_config() {
    print_header "Configuration Setup"
    
    read -p "Enter your domain name (e.g., vault.example.com) or IP address: " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        print_error "Domain/IP is required"
        exit 1
    fi
    
    # Check if it's an IP address
    if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        USE_IP=true
        print_warning "Using IP address - will use self-signed SSL certificate"
    else
        USE_IP=false
        read -p "Enter email for SSL certificate notifications: " SSL_EMAIL
        if [[ -z "$SSL_EMAIL" ]]; then
            print_warning "No email provided, using placeholder"
            SSL_EMAIL="admin@${DOMAIN}"
        fi
    fi
    
    read -p "Enable UFW firewall? (yes/no) [yes]: " fw_input
    ENABLE_FIREWALL=${fw_input:-yes}
    
    read -p "Enable Fail2ban? (yes/no) [yes]: " f2b_input
    ENABLE_FAIL2BAN=${f2b_input:-yes}
}

# Update system and install dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    apt-get update
    apt-get upgrade -y
    
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release \
        unzip \
        htop \
        nano \
        vim \
        jq \
        logrotate
    
    print_success "System dependencies installed"
}

# Create application user
create_app_user() {
    print_header "Creating Application User"
    
    if id "${APP_USER}" &>/dev/null; then
        print_warning "User ${APP_USER} already exists"
    else
        useradd -r -m -s /bin/bash "${APP_USER}"
        print_success "Created user: ${APP_USER}"
    fi
}

# Install Node.js via nvm
install_nodejs() {
    print_header "Installing Node.js ${NODE_VERSION}"
    
    # Install nvm for the app user
    sudo -u "${APP_USER}" bash -c '
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install '"${NODE_VERSION}"'
        nvm alias default '"${NODE_VERSION}"'
        nvm use default
    '
    
    print_success "Node.js ${NODE_VERSION} installed"
}

# Install Caddy web server
install_caddy() {
    print_header "Installing Caddy Web Server"
    
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
    
    print_success "Caddy installed"
}

# Setup application directory
setup_application() {
    print_header "Setting Up Application"
    
    mkdir -p "${APP_DIR}"
    
    if [[ -d "${APP_DIR}/.git" ]]; then
        print_warning "Repository already exists, pulling latest changes"
        cd "${APP_DIR}"
        git pull origin main
    else
        print_warning "Application directory created. You need to deploy your code here."
        print_warning "Use: git clone <your-repo-url> ${APP_DIR}"
    fi
    
    chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
    
    print_success "Application directory ready"
}

# Install npm dependencies and build
build_application() {
    print_header "Building Application"
    
    if [[ ! -f "${APP_DIR}/package.json" ]]; then
        print_warning "No package.json found. Skipping build."
        return
    fi
    
    sudo -u "${APP_USER}" bash -c '
        cd '"${APP_DIR}"'
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        npm install --production=false
        npm run build
    '
    
    print_success "Application built"
}

# Configure Caddy
configure_caddy() {
    print_header "Configuring Caddy"
    
    mkdir -p /etc/caddy/ssl
    
    if [[ "$USE_IP" == true ]]; then
        # Generate self-signed certificate for IP
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/caddy/ssl/server.key \
            -out /etc/caddy/ssl/server.crt \
            -subj "/CN=${DOMAIN}" \
            -addext "subjectAltName = IP:${DOMAIN}"
        
        cat > /etc/caddy/Caddyfile << EOF
{
    auto_https off
}

https://${DOMAIN} {
    tls /etc/caddy/ssl/server.crt /etc/caddy/ssl/server.key
    
    encode gzip zstd
    
    root * ${APP_DIR}/dist
    
    # API proxy (if using backend)
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # Edge functions proxy
    handle /functions/* {
        reverse_proxy localhost:54321
    }
    
    # SPA fallback
    try_files {path} /index.html
    file_server
    
    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
    
    # Logging
    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 10
        }
    }
}
EOF
    else
        cat > /etc/caddy/Caddyfile << EOF
${DOMAIN} {
    tls ${SSL_EMAIL}
    
    encode gzip zstd
    
    root * ${APP_DIR}/dist
    
    # API proxy (if using backend)
    handle /api/* {
        reverse_proxy localhost:3000
    }
    
    # Edge functions proxy
    handle /functions/* {
        reverse_proxy localhost:54321
    }
    
    # SPA fallback
    try_files {path} /index.html
    file_server
    
    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
    
    # Logging
    log {
        output file /var/log/caddy/access.log {
            roll_size 10mb
            roll_keep 10
        }
    }
}

# Redirect www to non-www
www.${DOMAIN} {
    redir https://${DOMAIN}{uri} permanent
}
EOF
    fi
    
    mkdir -p /var/log/caddy
    chown caddy:caddy /var/log/caddy
    
    systemctl restart caddy
    systemctl enable caddy
    
    print_success "Caddy configured"
}

# Create systemd service for the app
create_systemd_service() {
    print_header "Creating Systemd Service"
    
    cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=Virtual Vault Banking Application
Documentation=https://github.com/your-org/virtual-vault-banking
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/home/${APP_USER}/.nvm/versions/node/v${NODE_VERSION}.*/bin/node node_modules/.bin/vite preview --host 0.0.0.0 --port 3000
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=yes
ReadWritePaths=${APP_DIR}

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

    # Alternative service for production builds served with `serve`
    cat > /etc/systemd/system/${APP_NAME}-serve.service << EOF
[Unit]
Description=Virtual Vault Banking (Static Server)
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/dist
ExecStart=/home/${APP_USER}/.nvm/versions/node/v${NODE_VERSION}.*/bin/npx serve -s -l 3000
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    
    print_success "Systemd services created"
}

# Configure firewall
configure_firewall() {
    if [[ "$ENABLE_FIREWALL" != "yes" ]]; then
        print_warning "Firewall configuration skipped"
        return
    fi
    
    print_header "Configuring Firewall"
    
    apt-get install -y ufw
    
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    echo "y" | ufw enable
    
    print_success "Firewall configured"
}

# Install and configure Fail2ban
configure_fail2ban() {
    if [[ "$ENABLE_FAIL2BAN" != "yes" ]]; then
        print_warning "Fail2ban configuration skipped"
        return
    fi
    
    print_header "Configuring Fail2ban"
    
    apt-get install -y fail2ban
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd

[caddy-auth]
enabled = true
port = http,https
filter = caddy-auth
logpath = /var/log/caddy/access.log
maxretry = 3
bantime = 24h
EOF

    cat > /etc/fail2ban/filter.d/caddy-auth.conf << EOF
[Definition]
failregex = ^<HOST>.*"(POST|GET).*(login|auth).*" (401|403)
ignoreregex =
EOF

    systemctl restart fail2ban
    systemctl enable fail2ban
    
    print_success "Fail2ban configured"
}

# Enable automatic security updates
configure_auto_updates() {
    print_header "Configuring Automatic Updates"
    
    apt-get install -y unattended-upgrades
    
    cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF
    
    systemctl enable unattended-upgrades
    
    print_success "Automatic updates enabled"
}

# Create management scripts
create_management_scripts() {
    print_header "Creating Management Scripts"
    
    # Update script
    cat > /usr/local/bin/vault-update << 'SCRIPT'
#!/bin/bash
set -e

APP_DIR="/opt/virtual-vault-banking"
APP_USER="vaultapp"

echo "Updating Virtual Vault Banking..."

cd "$APP_DIR"
sudo -u "$APP_USER" git pull origin main

sudo -u "$APP_USER" bash -c '
    cd '"$APP_DIR"'
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    npm install --production=false
    npm run build
'

systemctl restart virtual-vault-banking

echo "Update complete!"
SCRIPT

    # Backup script
    cat > /usr/local/bin/vault-backup << 'SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/virtual-vault"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/virtual-vault-banking"

mkdir -p "$BACKUP_DIR"

# Backup application
tar -czf "$BACKUP_DIR/app_${DATE}.tar.gz" -C "$APP_DIR" .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/app_${DATE}.tar.gz"
SCRIPT

    # Status script
    cat > /usr/local/bin/vault-status << 'SCRIPT'
#!/bin/bash

echo "=== Virtual Vault Banking Status ==="
echo ""
echo "Services:"
systemctl status virtual-vault-banking --no-pager -l | head -20
echo ""
echo "Caddy:"
systemctl status caddy --no-pager -l | head -10
echo ""
echo "Recent Logs:"
journalctl -u virtual-vault-banking -n 20 --no-pager
SCRIPT

    # Logs script
    cat > /usr/local/bin/vault-logs << 'SCRIPT'
#!/bin/bash
journalctl -u virtual-vault-banking -f
SCRIPT

    chmod +x /usr/local/bin/vault-*
    
    print_success "Management scripts created"
}

# Configure log rotation
configure_logrotate() {
    print_header "Configuring Log Rotation"
    
    cat > /etc/logrotate.d/virtual-vault << EOF
/var/log/caddy/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 caddy caddy
    sharedscripts
    postrotate
        systemctl reload caddy > /dev/null 2>&1 || true
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

# Print summary
print_summary() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}Virtual Vault Banking has been configured.${NC}"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${BLUE}Application Details:${NC}"
    echo "  URL:            https://${DOMAIN}"
    echo "  App Directory:  ${APP_DIR}"
    echo "  App User:       ${APP_USER}"
    echo ""
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  vault-update    - Pull latest code and rebuild"
    echo "  vault-backup    - Create application backup"
    echo "  vault-status    - Check service status"
    echo "  vault-logs      - View live logs"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo "  systemctl start virtual-vault-banking"
    echo "  systemctl stop virtual-vault-banking"
    echo "  systemctl restart virtual-vault-banking"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Deploy your code to ${APP_DIR}"
    echo "  2. Run: vault-update"
    echo "  3. Start the service: systemctl start virtual-vault-banking"
    echo ""
    if [[ "$USE_IP" == true ]]; then
        echo -e "${YELLOW}Note: Using self-signed SSL. Browser will show warning.${NC}"
    fi
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# Main execution
main() {
    print_header "Virtual Vault Banking - Production Setup"
    echo "This script will configure a production-ready server environment."
    echo ""
    
    check_root
    gather_config
    install_dependencies
    create_app_user
    install_nodejs
    install_caddy
    setup_application
    build_application
    configure_caddy
    create_systemd_service
    configure_firewall
    configure_fail2ban
    configure_auto_updates
    create_management_scripts
    configure_logrotate
    print_summary
}

# Run main function
main "$@"
