# ManikCloud

Internal self-service developer platform powered by Proxmox.

## Recent Updates

### v2.0 - Pool System & UI Redesign (Latest)
- **Container Pool**: Pre-provisioned containers for instant workspace creation (~2-5s)
- **Historical Charts Redesign**: KPI headers, dark glass tooltips, loading skeletons, error retry
- **Resource Scaling**: Live CPU/memory/disk resizing without container restart
- **Template Cloning**: Full clone from pre-made Ubuntu template
- **Network I/O Fix**: Corrected rate calculation (was showing ~0/1MB, now shows proper bytes/sec)

### v1.0 - Initial Release
- User authentication with JWT + OTP
- Workspace CRUD operations
- Real-time monitoring (CPU, Memory, Disk, Network)
- Admin dashboard
- Proxmox LXC integration

## Features

- **User Authentication**: JWT-based authentication with OTP email verification
- **Workspace Management**: Create, start, stop, and delete development workspaces
- **Live Monitoring**: Real-time CPU, memory, disk usage, network traffic, and uptime stats
- **Historical Charts**: Time-series graphs with KPI values, loading skeletons, error retry
- **Resource Scaling**: Live CPU/memory/disk resizing without container restart
- **RBAC**: Role-based access control (Admin/User roles)
- **Proxmox Integration**: LXC container provisioning via template cloning
- **Admin Dashboard**: User and workspace management with system metrics

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + OTP via Gmail SMTP
- **Infrastructure**: Proxmox API for LXC containers

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Proxmox VE server access
- Gmail account with app password for SMTP
- Pre-made Ubuntu template container with `user`/`123456` sudo account

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd manikcloud

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory and configure the variables below.

### 3. Backend Configuration

Edit `backend/.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/manikcloud

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Proxmox API
PROXMOX_API_URL=https://your-proxmox-server:8006
PROXMOX_API_TOKEN=your-api-token
PROXMOX_API_SECRET=your-api-secret
PROXMOX_NODE=pve

# Proxmox SSH (for container user provisioning)
PROXMOX_SSH_HOST=your-proxmox-server
PROXMOX_SSH_USER=root
PROXMOX_SSH_PASSWORD=your-ssh-password

# Proxmox Template (pre-made Ubuntu with user/123456 sudo account)
PROXMOX_TEMPLATE_VMID=<your-template-vmid>

# Container Pool (pre-provisioned containers for instant workspace creation)
POOL_SIZE=3

# CORS — comma-separated list of allowed origins
CORS_ORIGIN=https://localhost,https://<your-server-ip>

# Application
PORT=5000
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=@timesglobal.com.np
DEFAULT_WORKSPACE_CPU=1
DEFAULT_WORKSPACE_MEMORY=512
DEFAULT_WORKSPACE_DISK=10
MAX_WORKSPACES_PER_USER=0
```

### CORS Configuration

The backend uses the `CORS_ORIGIN` environment variable to control which domains can access the API. Multiple origins are supported as a comma-separated list.

**Default origins (development):**
```
https://localhost, https://<your-server-ip>
```

**Examples:**

Allow a single custom domain:
```env
CORS_ORIGIN=https://myapp.example.com
```

Allow multiple origins:
```env
CORS_ORIGIN=https://app.example.com,https://admin.example.com
```

Allow all origins (not recommended with credentials):
```env
CORS_ORIGIN=*
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

> **Note:** The frontend dev server runs on port **443** with a self-signed SSL certificate. On Linux, this requires `sudo`. The included `start.sh` script handles this automatically — it will prompt for your sudo password when starting the frontend. SSL certs are auto-generated in `certs/` via `start.sh`.
>
> Since the certificate is self-signed (not issued by a public CA), your browser will show a security warning. This is expected for local development. To proceed:
>
> | Browser | Steps |
> |---------|-------|
> | **Chrome / Edge** | Click **Advanced** → **Proceed to \<your-server-ip\> (unsafe)** |
> | **Firefox** | Click **Advanced…** → **Accept the Risk and Continue** |
> | **Safari** | Click **Show Details** → **visit this website** → **Visit Website** |
>
> The warning only appears once per browser — subsequent visits will remember your choice.

### 5. Access the Application

- Frontend: `https://<your-server-ip>`
- Backend API: `http://localhost:5000`

## Container Pool (Pre-provisioned Containers)

ManikCloud uses a background pool of pre-provisioned containers to handle concurrent workspace creation without template locking.

### How It Works

1. **Background refill job** runs every 60 seconds
2. Maintains `POOL_SIZE` stopped containers (default: 3)
3. When user clicks "Create Workspace":
   - Grabs one from pool (~2-5 seconds)
   - Configures hostname, IP, user account
   - Starts container
4. Pool automatically refills in background

### Resource Usage

| Resource | Pool containers (stopped) | Active workspace |
|----------|---------------------------|------------------|
| CPU | 0 | ✅ Allocated |
| RAM | 0 | ✅ Allocated |
| Disk | ~30GB (3 × 10GB) | 10GB per user |
| Network | 0 | ✅ Active |

### Configuration

```env
# Number of pre-provisioned containers to maintain
POOL_SIZE=3
```

### Benefits

- **Instant creation**: Users get workspace in ~2-5s, not 20-30s
- **No template lock**: Background refill handles cloning, not user-facing requests
- **Bounded disk**: Only `POOL_SIZE × disk` used for pool
- **Graceful degradation**: If pool empty, falls back to direct clone

## Default Configuration

- **Workspace Resources**: 1 vCPU, 512MB RAM, 10GB disk
- **Container Pool**: 3 pre-provisioned containers
- **Max Workspaces per User**: Unlimited (configurable via `MAX_WORKSPACES_PER_USER`, set to `0` for unlimited)
- **OTP Expiry**: 10 minutes
- **JWT Access Token**: 15 minutes
- **JWT Refresh Token**: 7 days
- **Monitoring Poll Interval**: 10s (workspace detail), 30s (dashboard)

## System Requirements

### Minimum (Testing: 5-7 users)

| Component | Specification |
|-----------|---------------|
| **Backend Server** | 4GB RAM, 2+ cores, 20GB disk |
| **Proxmox Host** | 8GB RAM, 4+ cores, 100GB SSD |
| **Network** | 100Mbps+ |
| **Pool Size** | 1-3 containers |

### Recommended (Production: 20-50 users)

| Component | Specification |
|-----------|---------------|
| **Backend Server** | 8-16GB RAM, 8 cores, 50GB SSD |
| **Proxmox Host** | 64GB RAM, 16 cores, 1TB NVMe |
| **Network** | 1Gbps |
| **Pool Size** | 5-10 containers |

### Scale (Department: 100-200 users)

| Component | Specification |
|-----------|---------------|
| **Backend Server** | 32GB RAM, 16 cores, 100GB NVMe |
| **Proxmox Host** | 256GB RAM, 64 cores, 4TB NVMe RAID |
| **Network** | 10Gbps |
| **Pool Size** | 10-20 containers |

## Scaling Guide

### Vertical Scaling (Bigger Server)

No code changes needed. Just resize your VM:

```bash
# Proxmox: Resize VM
qm resize <VMID> memory 32G
qm resize <VMID> cores 16
```

### Horizontal Scaling (Multiple Servers)

1. **Split backend and Proxmox** onto separate servers
2. Update `.env` to point to new Proxmox host
3. Use MongoDB Atlas or replica set for database

### Pool Scaling

Adjust `POOL_SIZE` in `.env`:

```env
# Small team (5-10 users)
POOL_SIZE=2

# Department (20-50 users)
POOL_SIZE=5

# Organization (100+ users)
POOL_SIZE=10-20
```

### Performance Tuning

```bash
# Use PM2 for Node.js clustering
npm install -g pm2
pm2 start src/server.js -i max

# Monitor
pm2 monit
```

## Capacity Planning

| Users | Backend RAM | Proxmox RAM | Pool Size | Disk |
|-------|-------------|-------------|-----------|------|
| 5-10 | 4-8GB | 16-32GB | 2-3 | 100GB |
| 20-50 | 8-16GB | 64GB | 5-10 | 500GB |
| 100-200 | 16-32GB | 128-256GB | 10-20 | 1-2TB |
| 300+ | 32-64GB | 256-512GB | 20-30 | 4TB+ |

## Live Monitoring

Each workspace displays real-time monitoring data fetched from the Proxmox VE API:

| Metric | Description |
|--------|-------------|
| **CPU** | Current CPU usage as percentage of allocated cores |
| **Memory** | Current vs maximum memory usage |
| **Disk** | Current vs maximum root disk usage |
| **Network I/O** | Rate (bytes/sec) derived from cumulative counters |
| **Disk I/O** | Rate (bytes/sec) derived from cumulative counters |
| **Uptime** | Time since container was started (ticks in real-time) |

### Real-Time Monitoring
- **Dashboard**: Compact monitoring stats (CPU%, MEM%, uptime) shown on each running workspace card
- **Workspace Detail**: Full monitoring panel with progress bars, network/disk I/O, and uptime
- **Live Uptime**: Uptime counter ticks every second client-side, independent of polling interval
- **Polling**: Workspace detail page refreshes every 10s; dashboard every 30s

### Historical Charts
- **KPI Headers**: Current value displayed in chart headers (e.g., "CPU 12.5%", "Memory 412 MB")
- **Inline Legends**: Color-coded legend below title, no separate legend box
- **Dark Glass Tooltips**: Dark background with blur effect
- **Loading Skeletons**: Animated placeholders while data loads
- **Error State**: Retry button on fetch failure
- **Timeframes**: 1 Hour, 1 Day, 1 Week, 1 Month
- **Auto-refresh**: Charts refresh every 30 seconds
- **Accessibility**: aria-labels, prefers-reduced-motion support

### Resource Scaling
- **Live resize**: CPU, memory, and disk can be scaled without restarting container
- **Hot-plug**: Proxmox supports live CPU/memory add, disk grow
- **UI**: Gear icon on running workspaces opens resize modal
- **Limits**: CPU (1-8), Memory (256MB-16GB), Disk (5-200GB)

## Setup Guides

### Gmail SMTP Setup (for OTP emails)

1. **Enable 2-Step Verification:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" (required for app passwords)

2. **Generate App Password:**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → enter "ManikCloud"
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Configure `.env`:**
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=abcd efgh ijkl mnop   # Include spaces
   ```

> **Note:** Regular Gmail passwords won't work. You MUST use an app password.

---

### Proxmox API Token Setup

1. **Login to Proxmox Web UI:**
   - Open `https://your-proxmox-server:8006`
   - Login as `root@pam`

2. **Create API Token:**
   - Navigate: **Datacenter** → **Permissions** → **API Tokens** → **Add**
   - User: Select `root@pam` (or create a dedicated user)
   - **Uncheck** "Privilege Separation" (required for full access)
   - Comment: "ManikCloud API"
   - Click "Add"

3. **Copy Credentials:**
   - **Token ID:** `<user@realm!tokenid>` (format: `user@realm!tokenid`)
   - **Secret:** `<your-secret>` (copy this once, it won't show again)

4. **Configure `.env`:**
   ```env
   PROXMOX_API_URL=https://<your-proxmox-ip>:8006
   PROXMOX_API_TOKEN=<user@realm!tokenid>
   PROXMOX_API_SECRET=<your-secret>
   PROXMOX_NODE=pve
   ```

> **Note:** The API token user needs sufficient permissions. For testing, `root@pam` works. For production, create a least-privilege user.

---

### Proxmox SSH Setup (for container provisioning)

ManikCloud SSHes into Proxmox to run `pct exec` commands for user provisioning.

**Option 1: Password-based SSH**

1. **Enable root SSH login:**
   ```bash
   # On Proxmox host
   sudo nano /etc/ssh/sshd_config
   ```
   Set: `PermitRootLogin yes`

2. **Restart SSH:**
   ```bash
   sudo systemctl restart sshd
   ```

3. **Configure `.env`:**
   ```env
   PROXMOX_SSH_HOST=<your-proxmox-ip>
   PROXMOX_SSH_USER=root
   PROXMOX_SSH_PASSWORD=<your-root-password>
   ```

**Option 2: SSH Key (more secure)**

1. **Generate key pair:**
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/manikcloud_key
   ```

2. **Copy public key to Proxmox:**
   ```bash
   ssh-copy-id -i ~/.ssh/manikcloud_key.pub root@<your-proxmox-ip>
   ```

3. **Configure `.env`:**
   ```env
   PROXMOX_SSH_HOST=<your-proxmox-ip>
   PROXMOX_SSH_USER=root
   PROXMOX_SSH_KEY=/path/to/.ssh/manikcloud_key
   ```

> **Security:** Use SSH keys in production. Password-based SSH is easier for testing.

---

### Proxmox Template Creation

ManikCloud clones a pre-made Ubuntu template for fast workspace creation.

**Step 1: Create base container**

```bash
# On Proxmox host - create temporary container
qm create 9999 \
  --memory 2048 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-pci \
  --scsi0 local-lvm:32 \
  --ide2 local:iso/ubuntu-24.04-standard_24.04-2_amd64.tar.zst,media=cdrom \
  --ostype ubuntu \
  --unprivileged 1 \
  --features nesting=1
```

**Step 2: Start and install Ubuntu**

```bash
qm start 9999
# Wait for installation to complete via Proxmox console
```

**Step 3: Create sudo user**

```bash
# Enter container
pct exec 9999 -- bash

# Create user with sudo
useradd -m -s /bin/bash user
echo "user:123456" | chpasswd
usermod -aG sudo user

# Enable password login
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd

exit
```

**Step 4: Convert to template**

```bash
qm stop 9999
qm template 9999
```

**Step 5: Clone for ManikCloud**

```bash
# Get next available VMID
NEW_VMID=$(pvesh get /cluster/nextid)

# Clone template
qm clone 9999 $NEW_VMID --full
qm set $NEW_VMID --hostname manikcloud-template

# Note the VMID for .env
echo "Template VMID: $NEW_VMID"
```

**Step 6: Configure `.env`**

```env
# Use the VMID from Step 5
PROXMOX_TEMPLATE_VMID=<your-template-vmid>
```

> **Note:** The template has `user`/`123456` account. ManikCloud removes this and creates workspace-specific users automatically.

---

### MongoDB Setup

**Option 1: Local MongoDB**

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

**Option 2: MongoDB Atlas (cloud)**

1. Create free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create cluster (free tier: M0)
3. Database Access → Add user with password
4. Network Access → Add IP (0.0.0.0/0 for testing)
5. Connect → Copy connection string

**Configure `.env`:**

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/manikcloud

# OR MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/manikcloud
```

---

### Node.js Setup

```bash
# Install Node.js 18+ (Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version   # Should be v18.x.x or higher
npm --version    # Should be 9.x.x or higher

# Install project dependencies
cd backend && npm install
cd ../frontend && npm install
```

---

### SSL Certificate Setup (Frontend)

The frontend dev server runs on HTTPS with self-signed certs.

**Automatic (via start.sh):**

```bash
./start.sh
# Prompts for sudo password, auto-generates certs in certs/
```

**Manual:**

```bash
# Generate self-signed cert
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/CN=<your-server-ip>"
```

**Browser warnings:** Expected for self-signed certs. Click "Advanced" → "Proceed" to continue.

---

### Complete `.env` Example

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/manikcloud

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Proxmox API
PROXMOX_API_URL=https://<your-proxmox-ip>:8006
PROXMOX_API_TOKEN=<user@realm!tokenid>
PROXMOX_API_SECRET=<your-secret>
PROXMOX_NODE=pve

# Proxmox SSH
PROXMOX_SSH_HOST=<your-proxmox-ip>
PROXMOX_SSH_USER=root
PROXMOX_SSH_PASSWORD=<your-root-password>

# Proxmox Template
PROXMOX_TEMPLATE_VMID=<your-template-vmid>

# Container Pool
POOL_SIZE=3

# CORS
CORS_ORIGIN=https://localhost,https://<your-server-ip>

# Application
PORT=5000
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=@timesglobal.com.np
DEFAULT_WORKSPACE_CPU=1
DEFAULT_WORKSPACE_MEMORY=512
DEFAULT_WORKSPACE_DISK=10
MAX_WORKSPACES_PER_USER=0
```

---

### IP Range Configuration

ManikCloud assigns static IPs to containers from a configurable range.

**Default configuration:**
```env
WORKSPACE_SUBNET=192.168.55.0/24
WORKSPACE_GATEWAY=192.168.55.1
WORKSPACE_IP_START=192.168.55.100
WORKSPACE_IP_END=192.168.55.200
```

**Configuration guide:**

1. **Choose an IP range** not used by other devices:
   ```bash
   # Check used IPs in your network
   arp -a | grep -v "incomplete"
   ```

2. **Update `.env`:**
   ```env
   # Example: Use 10.0.0.x range
   WORKSPACE_SUBNET=10.0.0.0/24
   WORKSPACE_GATEWAY=10.0.0.1
   WORKSPACE_IP_START=10.0.0.100
   WORKSPACE_IP_END=10.0.0.200
   ```

3. **Ensure Proxmox bridge is configured:**
   ```bash
   # On Proxmox host - check bridge config
   cat /etc/network/interfaces
   ```

> **Note:** Reserve IPs outside DHCP range to avoid conflicts. For 200+ users, use a /23 or /22 subnet.

---

### Firewall Rules

Configure firewall rules for security.

**Backend server (port 5000):**
```bash
# Allow HTTPS (frontend)
sudo ufw allow 443/tcp

# Allow API (backend)
sudo ufw allow 5000/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

**Proxmox host:**
```bash
# Allow Proxmox web UI
sudo ufw allow 8006/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Allow container traffic (internal network)
sudo ufw allow from 192.168.55.0/24

# Enable firewall
sudo ufw enable
```

**Container network (iptables on Proxmox):**
```bash
# Allow containers to access internet
iptables -t nat -A POSTROUTING -s 192.168.55.0/24 -o vmbr0 -j MASQUERADE

# Persist rules
iptables-save > /etc/iptables/rules.v4
```

---

### Docker Deployment (Alternative)

Deploy ManikCloud using Docker for easier management.

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/logs:/app/logs
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "443:443"
    volumes:
      - ./certs:/app/certs
    restart: unless-stopped

volumes:
  mongodb_data:
```

**Deploy with Docker:**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

### Backup & Recovery

**Database backup:**
```bash
# Backup MongoDB
mongodump --db manikcloud --out /backup/$(date +%Y%m%d)

# Restore MongoDB
mongorestore --db manikcloud /backup/20240101/manikcloud
```

**Proxmox container backup:**
```bash
# Backup container
vzdump <VMID> --storage local --compress zstd

# Restore container
qmrestore /var/lib/vz/dump/vzdump-qemu-<VMID>-*.vma.zstd <new-VMID>
```

**Configuration backup:**
```bash
# Backup .env and configs
tar -czf manikcloud-backup-$(date +%Y%m%d).tar.gz \
  backend/.env \
  backend/src/ \
  frontend/src/ \
  README.md
```

**Automated backup script:**
```bash
#!/bin/bash
# /opt/manikcloud/backup.sh

BACKUP_DIR="/backup/manikcloud"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --db manikcloud --out $BACKUP_DIR/$DATE

# Backup configs
tar -czf $BACKUP_DIR/$DATE-configs.tar.gz \
  /opt/manikcloud/backend/.env \
  /opt/manikcloud/README.md

# Keep only last 7 days
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

**Schedule with cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/manikcloud/backup.sh >> /var/log/manikcloud-backup.log 2>&1
```

---

### Monitoring & Logs

**View backend logs:**
```bash
# Real-time logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log

# Search for specific workspace
grep "workspace-id" backend/logs/combined.log
```

**PM2 monitoring:**
```bash
# Install PM2
npm install -g pm2

# Start with monitoring
pm2 start src/server.js --name manikcloud

# View logs
pm2 logs manikcloud

# Monitor resources
pm2 monit

# Restart
pm2 restart manikcloud
```

**System monitoring:**
```bash
# Check Node.js memory
pm2 show manikcloud

# Check system resources
htop

# Check disk usage
df -h

# Check network connections
netstat -tulpn | grep :5000
```

**Proxmox monitoring:**
```bash
# Check container status
pvesh get /nodes/pve/lxc

# Check storage
pvesh get /nodes/pve/storage

# Check cluster status
pvesh get /cluster/status
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Workspaces
- `POST /api/workspaces` - Create workspace (uses pool if available)
- `GET /api/workspaces` - List user workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `GET /api/workspaces/:id/rrddata` - Get historical monitoring data (timeframe: hour|day|week|month)
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/start` - Start workspace
- `POST /api/workspaces/:id/stop` - Stop workspace
- `POST /api/workspaces/:id/restart` - Restart workspace
- `POST /api/workspaces/:id/resize` - Resize workspace resources (CPU/memory/disk)

### Admin (Admin role required)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/workspaces` - List all workspaces
- `DELETE /api/admin/workspaces/:id` - Delete workspace
- `GET /api/admin/metrics` - Get system metrics
- `GET /api/admin/activity-logs` - Get activity logs

## Development

### Project Structure

```
manikcloud/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Custom middleware
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   └── tests/               # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   └── utils/           # Utility functions
│   └── index.html           # Entry HTML
```

### Code Style

- ESLint for JavaScript linting
- Prettier for code formatting
- Consistent naming conventions

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend build
cd frontend
npm run build
```

## Security Considerations

- Proxmox API tokens are never exposed to the frontend
- RBAC enforced on every request
- Email domain restriction (@timesglobal.com.np)
- OTP verification required for account activation
- Rate limiting on authentication endpoints
- Helmet.js for HTTP security headers
- Container creation serialized via mutex (prevents VMID/IP collisions)
- Container pool uses stopped containers (zero CPU/RAM usage until claimed)

## Troubleshooting

### Pool Not Refilling

```bash
# Check backend logs
tail -f backend/logs/combined.log | grep -i pool

# Manual pool check via API
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/workspaces
```

### Container Creation Slow

1. Check pool size: `POOL_SIZE` in `.env`
2. Check Proxmox load: `pvesh get /nodes/your-node/status`
3. Check disk I/O: `iostat -x 1`

### Memory Issues

```bash
# Check Node.js memory
pm2 monit

# Check system memory
free -h

# If low, reduce pool or upgrade RAM
```

### Network Issues

```bash
# Check container connectivity
pct exec <VMID> -- ping 8.8.8.8

# Check IP allocation
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/workspaces | jq '.[].ip'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is curiosity-led — built to learn, experiment, and explore.