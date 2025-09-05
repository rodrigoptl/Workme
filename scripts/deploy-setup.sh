#!/bin/bash

# WorkMe Production Deployment Setup Script
# This script sets up the production environment on DigitalOcean droplets

set -e

# Configuration
ENVIRONMENT=${1:-staging}  # staging or production
DOMAIN_PREFIX=${2:-api}

if [ "$ENVIRONMENT" = "production" ]; then
    DOMAIN="${DOMAIN_PREFIX}.workme.com.br"
    COMPOSE_FILE="docker-compose.production.yml"
else
    DOMAIN="${DOMAIN_PREFIX}-staging.workme.com.br"
    COMPOSE_FILE="docker-compose.staging.yml"
fi

echo "🚀 Setting up WorkMe $ENVIRONMENT environment"
echo "Domain: $DOMAIN"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    htop \
    curl \
    git \
    unzip

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Start and enable Docker
echo "🐳 Configuring Docker..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Create directory structure
echo "📁 Creating directory structure..."
sudo mkdir -p /var/www/workme/{staging,production}
sudo mkdir -p /var/log/workme/{staging,production}
sudo mkdir -p /etc/workme/{staging,production}
sudo chown -R $USER:$USER /var/www/workme
sudo chown -R $USER:$USER /var/log/workme
sudo chown -R $USER:$USER /etc/workme

# Copy application files
echo "📋 Copying application files..."
if [ ! -d "/var/www/workme/$ENVIRONMENT/workme" ]; then
    cd /var/www/workme/$ENVIRONMENT
    git clone https://github.com/your-org/workme.git
else
    cd /var/www/workme/$ENVIRONMENT/workme
    git pull origin main
fi

# Copy configuration files
cp docker/production/$COMPOSE_FILE /var/www/workme/$ENVIRONMENT/docker-compose.yml
cp nginx/$ENVIRONMENT.conf /etc/nginx/sites-available/$DOMAIN

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Get SSL certificate
echo "🔒 Obtaining SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@workme.com.br

# Configure fail2ban
echo "🛡️ Configuring fail2ban..."
sudo tee /etc/fail2ban/jail.d/workme-api.conf > /dev/null <<EOF
[workme-api]
enabled = true
port = http,https
filter = workme-api
logpath = /var/log/workme/$ENVIRONMENT/access.log
maxretry = 5
bantime = 3600
findtime = 600
EOF

# Create fail2ban filter
sudo tee /etc/fail2ban/filter.d/workme-api.conf > /dev/null <<EOF
[Definition]
failregex = ^<HOST> - - \[.*\] "(GET|POST|PUT|DELETE) /api/.* HTTP/.*" (4[0-9][0-9]|5[0-9][0-9]) .*$
ignoreregex =
EOF

sudo systemctl restart fail2ban

# Set up log rotation
echo "📜 Configuring log rotation..."
sudo tee /etc/logrotate.d/workme > /dev/null <<EOF
/var/log/workme/*/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /var/www/workme/$ENVIRONMENT/docker-compose.yml restart nginx
    endscript
}
EOF

# Create monitoring script
echo "📊 Setting up monitoring..."
sudo tee /usr/local/bin/workme-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
ENVIRONMENT=$1
LOG_DIR="/var/log/workme/$ENVIRONMENT"

# Health check
curl -f https://api.workme.com.br/api/health > $LOG_DIR/health-check.log 2>&1
if [ $? -ne 0 ]; then
    echo "$(date): Health check failed" >> $LOG_DIR/monitoring.log
fi

# Resource monitoring
df -h > $LOG_DIR/disk-usage.log
free -h > $LOG_DIR/memory-usage.log
ps aux --sort=-%cpu | head -20 > $LOG_DIR/cpu-usage.log

# Docker status
docker ps > $LOG_DIR/docker-status.log
EOF

sudo chmod +x /usr/local/bin/workme-monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/workme-monitor.sh $ENVIRONMENT") | crontab -

# Set up automatic updates
echo "🔄 Configuring automatic security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Create deployment script
tee /var/www/workme/$ENVIRONMENT/deploy.sh > /dev/null <<EOF
#!/bin/bash
set -e

cd /var/www/workme/$ENVIRONMENT

echo "🚀 Deploying WorkMe $ENVIRONMENT..."

# Pull latest code
git pull origin main

# Build and deploy
docker-compose pull
docker-compose up -d --build

# Wait for services
sleep 30

# Health check
curl -f https://$DOMAIN/api/health

echo "✅ Deployment complete!"
EOF

chmod +x /var/www/workme/$ENVIRONMENT/deploy.sh

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in /var/www/workme/$ENVIRONMENT/.env"
echo "2. Configure MongoDB Atlas connection"
echo "3. Set up Stripe keys"
echo "4. Run: cd /var/www/workme/$ENVIRONMENT && ./deploy.sh"
echo ""
echo "Monitoring:"
echo "- Logs: /var/log/workme/$ENVIRONMENT/"
echo "- Health: https://$DOMAIN/api/health"
echo "- Metrics: https://$DOMAIN/api/metrics"