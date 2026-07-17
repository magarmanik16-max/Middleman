# TimesGlobal Cloud

Internal self-service developer platform powered by Proxmox.

## Features

- **User Authentication**: JWT-based authentication with OTP email verification
- **Workspace Management**: Create, start, stop, and delete development workspaces
- **RBAC**: Role-based access control (Admin/User roles)
- **Proxmox Integration**: LXC container provisioning and management
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

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd timesglobal-cloud

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
MONGODB_URI=mongodb://localhost:27017/timesglobal_cloud

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Proxmox
PROXMOX_API_URL=https://your-proxmox-server:8006
PROXMOX_API_TOKEN=your-api-token
PROXMOX_API_SECRET=your-api-secret

# CORS — comma-separated list of allowed origins
# Examples:
#   Single origin:    CORS_ORIGIN=https://app.example.com
#   Multiple origins: CORS_ORIGIN=https://localhost,https://192.168.55.155
#   All origins:      CORS_ORIGIN=*
CORS_ORIGIN=https://localhost,https://192.168.55.155

# Application
PORT=5000
NODE_ENV=development
ALLOWED_EMAIL_DOMAIN=@timesglobal.com.np
```

### CORS Configuration

The backend uses the `CORS_ORIGIN` environment variable to control which domains can access the API. Multiple origins are supported as a comma-separated list.

**Default origins (development):**
```
https://localhost, https://192.168.55.155
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

> **Note:** In Docker, set `CORS_ORIGIN` in your `.env` file or directly in `docker-compose.yml` under the backend service's environment variables.

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
> | **Chrome / Edge** | Click **Advanced** → **Proceed to 192.168.55.155 (unsafe)** |
> | **Firefox** | Click **Advanced…** → **Accept the Risk and Continue** |
> | **Safari** | Click **Show Details** → **visit this website** → **Visit Website** |
>
> The warning only appears once per browser — subsequent visits will remember your choice.

### 5. Access the Application

- Frontend: https://192.168.55.155
- Backend API: http://localhost:5000

## Default Configuration

- **Workspace Resources**: 1 vCPU, 512MB RAM, 10GB disk
- **Max Workspaces per User**: 1
- **OTP Expiry**: 10 minutes
- **JWT Access Token**: 15 minutes
- **JWT Refresh Token**: 7 days

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - List user workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/start` - Start workspace
- `POST /api/workspaces/:id/stop` - Stop workspace
- `POST /api/workspaces/:id/restart` - Restart workspace

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
timesglobal-cloud/
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.