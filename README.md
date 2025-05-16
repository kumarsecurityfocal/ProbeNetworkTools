# ProbeOps - Network Diagnostics Platform

ProbeOps is a comprehensive network operations platform that delivers advanced deployment management, network diagnostics, and intelligent cloud-native solutions for seamless infrastructure monitoring and control.

## Project Organization

This repository has been organized into the following structure:

```
├── backend/           # FastAPI backend code
├── frontend/          # React.js frontend code
├── nginx/             # NGINX configuration
├── probe/             # Probe node agent code
├── public/            # Built frontend assets
├── docs/              # Documentation
│   └── guides/        # Deployment and usage guides
├── scripts/           # Scripts for different purposes
│   ├── deployment/    # Deployment automation scripts
│   ├── testing/       # Testing and verification scripts
│   └── utilities/     # Utility scripts for maintenance
```

## Quick Start

### Running the Application

1. Start the backend API:
   ```
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. Start the frontend server:
   ```
   node server.js
   ```

### Deploying the Application

To deploy the complete stack with a single command:
```
bash scripts/deployment/deploy.sh
```

This deployment script will:
- Build the frontend assets
- Configure NGINX
- Set up database connections
- Start all required services

### Deploying a Probe Node

See [Probe Node Deployment Steps](docs/guides/PROBE_NODE_DEPLOYMENT_STEPS.md) for detailed instructions.

## Documentation

- [Deployment Guidelines](docs/guides/DEPLOYMENT_GUIDELINES.md)
- [Fresh Deployment Guide](docs/guides/FRESH_DEPLOYMENT_GUIDE.md)
- [Frontend Build Fix](docs/guides/FRONTEND_BUILD_FIX.md)
- [Probe Node Documentation](docs/guides/PROBE_NODE_DOCUMENTATION.md)
- [Probe Node Connectivity](docs/guides/PROBE_NODE_CONNECTIVITY.md)
- [Project Status](docs/guides/PROJECT_STATUS.md)

## Testing

To test the backend API:
```
bash scripts/testing/test-backend-api.sh
```

To test probe node connectivity:
```
bash scripts/testing/verify-probe-connection.sh --url https://your-probeops-domain.com
```

## Architecture

The platform consists of several components:

1. **Backend API** - FastAPI application providing RESTful endpoints for all platform functionality
2. **Frontend UI** - React.js web application for user interaction
3. **Probe Nodes** - Distributed agents that perform network diagnostics
4. **NGINX Server** - Reverse proxy and static file server

## Stack

- FastAPI backend
- React.js frontend
- Docker containerization
- PostgreSQL database
- NGINX reverse proxy
- Alembic migration management
- JWT authentication
- Tailwind CSS
- Vite build system