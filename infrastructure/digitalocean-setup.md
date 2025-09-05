# 🌊 DigitalOcean Infrastructure Setup - WorkMe

## 📋 Infrastructure Overview

### **Droplets Configuration**
- **Staging**: 2GB RAM, 1 vCPU, 50GB SSD - Ubuntu 22.04 LTS
- **Production**: 4GB RAM, 2 vCPU, 80GB SSD - Ubuntu 22.04 LTS
- **Location**: São Paulo (sfo3) or New York (nyc1) for Brazil access

### **Domain Configuration**
- **Production**: `api.workme.com.br`
- **Staging**: `api-staging.workme.com.br`
- **Frontend**: `workme.com.br` (staging: `staging.workme.com.br`)

## 🔧 Droplet Setup Commands

### **1. Initial Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx fail2ban ufw

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Start services
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### **2. Directory Structure**
```bash
# Create application directories
sudo mkdir -p /var/www/workme/{staging,production}
sudo mkdir -p /var/log/workme/{staging,production}
sudo chown -R $USER:$USER /var/www/workme
sudo chown -R $USER:$USER /var/log/workme
```

### **3. Nginx Configuration**
```bash
# Remove default nginx config
sudo rm /etc/nginx/sites-enabled/default

# We'll create staging and production configs separately
```

## 🔐 Security Configuration

### **Fail2Ban Configuration**
```bash
# Create custom fail2ban jail for API
sudo tee /etc/fail2ban/jail.d/workme-api.conf > /dev/null <<EOF
[workme-api]
enabled = true
port = http,https
filter = workme-api
logpath = /var/log/workme/*/access.log
maxretry = 5
bantime = 3600
findtime = 600
EOF
```

### **Rate Limiting & Security Headers**
- Rate limiting: 100 requests/minute per IP
- CORS properly configured for frontend domains only
- Security headers (HSTS, CSP, X-Frame-Options)
- Request body size limits (10MB for file uploads)

## 📊 Monitoring Setup

### **System Monitoring**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Create monitoring script
sudo tee /usr/local/bin/system-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Basic system monitoring script
df -h > /var/log/workme/disk-usage.log
free -h > /var/log/workme/memory-usage.log
ps aux --sort=-%cpu | head -20 > /var/log/workme/cpu-usage.log
EOF

sudo chmod +x /usr/local/bin/system-monitor.sh

# Add to crontab (every 5 minutes)
echo "*/5 * * * * /usr/local/bin/system-monitor.sh" | sudo crontab -
```

## 🗄️ Database Configuration

### **MongoDB Atlas Connection**
- **Staging Cluster**: workme-staging (M10 tier)
- **Production Cluster**: workme-production (M10 tier)
- **Region**: AWS São Paulo (sa-east-1)
- **Backup**: Daily automated backups retained for 7 days

### **Connection Security**
- IP Allowlist: Droplet IPs only
- Database users with minimal required permissions
- Connection string with SSL enabled

## 🚀 Deployment Process

### **1. Staging Deployment**
1. Deploy to staging environment
2. Run automated tests
3. Manual QA testing
4. Performance validation

### **2. Production Deployment**
1. Create Droplet snapshot (rollback point)
2. Deploy to production
3. Health checks
4. Smoke tests
5. Monitor for 15 minutes

### **3. Rollback Plan**
1. Restore from Droplet snapshot (< 5 minutes)
2. Switch MongoDB connection to previous backup
3. Update DNS if needed
4. Validate system recovery

## 📋 Pre-Deployment Checklist

- [ ] Domain DNS configured
- [ ] SSL certificates issued
- [ ] MongoDB Atlas clusters created
- [ ] Stripe Live keys configured
- [ ] Environment variables set
- [ ] Docker images built and tested
- [ ] Nginx configurations tested
- [ ] Monitoring tools configured
- [ ] Backup and rollback procedures tested

## 🔄 CI/CD Pipeline (GitHub Actions)

Pipeline will be triggered on:
- **Staging**: Push to `develop` branch
- **Production**: Push to `main` branch or release tag

Each deployment includes:
1. Build and test
2. Security scan
3. Deploy to target environment
4. Run health checks
5. Send Slack/email notification