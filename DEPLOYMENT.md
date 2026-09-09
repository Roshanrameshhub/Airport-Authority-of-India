# Airports Authority of India (AAI) — Asset Management System
## Production Deployment & Operational Runbook (Phase 11)

This guide details the complete production deployment, hardening, operational maintenance, and disaster recovery procedures for the **AAI Regional Office Asset Management System**.

---

## 1. System Architecture & Network Topology

```mermaid
graph TD
    Client["Airport Staff & Admin Browsers / Scanners"] -->|HTTPS :443| Nginx["Nginx Reverse Proxy & SSL Termination"]
    Nginx -->|Proxy Pass :5000| ExpressCluster["Node.js / Express API (PM2 Cluster)"]
    Nginx -->|Static Assets| ClientBundle["Vite Production Dist (/dist)"]
    ExpressCluster -->|Encrypted Mongoose Driver| MongoDB["MongoDB 7.x Replica Set"]
    ExpressCluster -->|Binary PDF Stream| LabelPrinter["Airport Thermal / Laser Tag Printers"]
    ExpressCluster -->|Audit Trail Engine| AuditLedger["Immutable Audit Log Store"]
```

---

## 2. Infrastructure Requirements & Prerequisites

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Operating System** | Ubuntu Server 22.04 LTS / Windows Server 2022 | Ubuntu 22.04 LTS (Dedicated IT VM) |
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 40 GB NVMe SSD | 100 GB NVMe SSD (with automated snapshots) |
| **Runtime** | Node.js v20.x LTS | Node.js v20.12+ LTS |
| **Database** | MongoDB 6.0+ | MongoDB 7.0 Community / Enterprise |
| **Web Server** | Nginx 1.22+ | Nginx 1.24+ with OpenSSL 3.0+ |

---

## 3. Production Environment Configuration

### Server Environment (`server/.env`)
```env
# Server Runtime
NODE_ENV=production
PORT=5000
CLIENT_URL=https://assets.regional.aai.aero

# Database Connectivity
MONGODB_URI=mongodb://aai_app_user:StrongSecretPasswd2026!@127.0.0.1:27017/aai-asset-management?authSource=admin&replicaSet=rs0

# JWT Security
JWT_SECRET=AAI_REGIONAL_SECURE_HMAC_SHA256_KEY_2026_ENTERPRISE_DEPLOYMENT
JWT_EXPIRE=8h

# Rate Limiting & Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
```

---

## 4. Database Setup & Regional Seeding

### 1. Initialize MongoDB Database
```bash
# Connect to mongosh as admin
mongosh -u admin -p

# Create application user with readWrite privileges
use aai-asset-management
db.createUser({
  user: "aai_app_user",
  pwd: "StrongSecretPasswd2026!",
  roles: [{ role: "readWrite", db: "aai-asset-management" }]
})
```

### 2. Populate Regional Master Directory & Assets
Execute the automated standalone database seeder to establish baseline data for ATC, CNS, Terminal Ops, Finance, HR, and OEM maintenance contracts:
```bash
cd /opt/aai/server
npm run seed
```

---

## 5. Process Management with PM2

Create PM2 ecosystem file `/opt/aai/server/ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'aai-asset-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```

Start the service with system startup persistence:
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

## 6. Nginx Reverse Proxy & SSL Configuration

Deploy `/etc/nginx/sites-available/aai-assets.conf`:
```nginx
server {
    listen 80;
    server_name assets.regional.aai.aero;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name assets.regional.aai.aero;

    ssl_certificate /etc/ssl/certs/aai_regional.crt;
    ssl_certificate_key /etc/ssl/private/aai_regional.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Single Page App
    root /opt/aai/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;
    }
}
```

---

## 7. Physical Equipment Tagging & Label Printing Operations

### Thermal / Laser Label Printing Specifications
- **Dimensions**: Standard 4" x 2" (101.6mm x 50.8mm) industrial polyester or thermal sticker tags.
- **Resolution**: 300 DPI minimum for clear 2D QR matrix readability by handheld warehouse scanners.
- **Sticker Stock**: Heavy-duty matte polyester with tamper-evident adhesive for regional airport equipment.

### Operational Printing Workflows:
1. **Single Asset Tag**: Access `Asset Inventory` $\rightarrow$ Click `QR / Tag` button $\rightarrow$ Click `Print Sticker Tag (PDF)`.
2. **Bulk Equipment Tag Sheet**: Access `/api/v1/tags/batch/pdf` (Admin only) to generate 8-per-page A4 sticker sheets for departmental inventory rollouts.
3. **Mobile Scan Verification**: Security and IT staff can scan the physical QR code with any standard barcode scanner or mobile terminal to instantly open `/assets?search=[AssetId]` or verify against `/api/v1/tags/verify/:identifier`.

---

## 8. Backup & Disaster Recovery Procedures

### Automated Daily Backup Script (`/opt/aai/scripts/daily_backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/backup/aai_mongo"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$BACKUP_DIR/aai_backup_$TIMESTAMP"

mkdir -p "$DEST"
mongodump --uri="mongodb://aai_app_user:StrongSecretPasswd2026!@127.0.0.1:27017/aai-asset-management?authSource=admin" --out="$DEST"

# Compress archive
tar -czf "$DEST.tar.gz" -C "$BACKUP_DIR" "aai_backup_$TIMESTAMP"
rm -rf "$DEST"

# Retain 30 days of archives
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/aai/scripts/daily_backup.sh >> /var/log/aai_backup.log 2>&1
```

### Full Disaster Recovery / Restoration
```bash
tar -xzf /backup/aai_mongo/aai_backup_20260908.tar.gz
mongorestore --uri="mongodb://aai_app_user:StrongSecretPasswd2026!@127.0.0.1:27017/aai-asset-management?authSource=admin" --drop aai_backup_20260908/aai-asset-management
```

---

## 9. Verification & Health Monitoring

Verify production service readiness using the built-in diagnostic endpoint:
```bash
curl -i https://assets.regional.aai.aero/api/v1/health
```
Expected response:
```json
{
  "success": true,
  "data": {
    "status": "HEALTHY",
    "service": "AAI Regional Office - Asset Management System API",
    "database": "CONNECTED",
    "environment": "production",
    "uptime": "8432s",
    "memory": {
      "rss": "88 MB",
      "heapTotal": "52 MB",
      "heapUsed": "41 MB"
    }
  }
}
```
