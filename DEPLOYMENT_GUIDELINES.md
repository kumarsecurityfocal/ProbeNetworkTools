# ProbeOps Deployment Guidelines

This document outlines **critical guidelines** for working with the ProbeOps project to ensure production safety and security.

**Note**: For complete deployment instructions, see the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

## 1. SSL Certificate Safety

⚠️ **CRITICAL**: Do NOT alter the SSL certificate directory structure.

- The folder `./nginx/ssl/live/probeops.com-0001/` contains production Let's Encrypt certificates.
- These are used for HTTPS termination in the live deployment.
- Never delete, overwrite, rename, or commit anything into the `nginx/ssl/` directories.
- The `.gitignore` file is configured to exclude these paths - **keep it this way**.

> For local development/testing: Create a separate `ssl-dev/` folder and point NGINX there in a development-only override file.

## 2. Docker Volume Mount Guidelines

- **Avoid** introducing volume mounts that point to `frontend/dist/` or `nginx/ssl/` from the host.
- Doing so can wipe built assets or valid certificates inside containers.
- Front-end assets should be built during the deployment process, not mounted from the host.

## 3. Environment Variable Management

- Use `.env.backend`, `.env.probe`, and `.env.production` files to load configuration.
- **Never commit real secrets or API keys to Git.**
- All sensitive configuration should be loaded through environment variables.
- Reference the `.env.template` file for required environment variables.

## 4. Service Architecture

The architecture is finalized as:

- `frontend/`: React + Vite application
- `backend/`: FastAPI service
- `probe/`: Lightweight network diagnostic agent
- `nginx/`: Reverse proxy + SSL termination
- **AWS RDS**: External PostgreSQL database

> ⚠️ **IMPORTANT**: Do not rewire this architecture or combine services. This is the intended production design.

## 5. Testing Guidelines

- Use `http://localhost` or mock certificates for development.
- Push only code-related updates (no build artifacts or sensitive assets).
- Do not modify `nginx.conf` without prior coordination with the team.
- Test deployments in a staging environment before pushing to production.

## 6. Deployment Process

- The `deploy.sh` script handles the deployment process.
- Make sure all tests pass before deployment.
- The deployment process includes:
  - Building the frontend assets
  - Starting or restarting all Docker containers
  - Configuring the NGINX reverse proxy
  - Setting up SSL certificates (if needed)

## 7. Database Guidelines

- Database migrations should be handled through Alembic.
- Never perform destructive database operations directly in production.
- Test all migrations in a development environment first.

---

**If you have any questions about these guidelines, please contact the team lead before proceeding.**