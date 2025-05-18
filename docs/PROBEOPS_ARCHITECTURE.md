# ProbeOps Architecture Documentation

## System Architecture Overview

```
                  ┌────────────────┐
                  │                │
                  │  User Browser  │
                  │                │
                  └────────┬───────┘
                           │
                           ▼
             ┌─────────────────────────┐
             │                         │
             │    Express Server       │
             │    (server.js)          │
             │    Port 5000            │
             │                         │
             └───────────┬─────────────┘
                         │
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
│                 │ │             │ │              │
│ Static Assets   │ │ Auth API    │ │ Backend API  │
│ (React Bundle)  │ │ (server.js) │ │ (FastAPI)    │
│                 │ │             │ │ Port 8000    │
└─────────────────┘ └─────────────┘ └──────────────┘
                                           │
                                           │
                                           ▼
                                   ┌──────────────────┐
                                   │                  │
                                   │   PostgreSQL     │
                                   │   Database       │
                                   │                  │
                                   └──────────────────┘
```

## Component Description

### 1. Frontend (React Application)

The frontend is built using React.js with the following key libraries:
- **React Router DOM**: For client-side routing
- **Material UI**: For UI components
- **Axios**: For HTTP requests
- **JWT**: For authentication token handling

The frontend is compiled using Vite and served as static assets from the Express server.

### 2. Express Server (server.js)

The Express server serves multiple functions:
- Static file serving (compiled React app)
- API proxy to backend FastAPI service
- Authentication handling with JWT tokens

The server listens on port 5000 and handles all incoming requests from the browser.

### 3. Backend API (FastAPI)

The backend API is built with FastAPI (Python) and provides:
- RESTful API endpoints
- Database interactions via SQLAlchemy
- Authentication via OAuth2/JWT
- Business logic for network operations and diagnostics

The API server listens on port 8000.

### 4. PostgreSQL Database

Stores all application data including:
- User accounts
- Authentication sessions
- Diagnostic results
- Network probe configurations
- Subscription information

## Authentication Flow

```
┌────────┐     ┌───────────┐      ┌────────────┐     ┌────────────┐
│ Client │     │ Express   │      │ FastAPI    │     │ PostgreSQL │
│        │     │ Server    │      │ Backend    │     │ Database   │
└───┬────┘     └─────┬─────┘      └──────┬─────┘     └──────┬─────┘
    │                │                    │                  │
    │  Login Request │                    │                  │
    │───────────────>│                    │                  │
    │                │                    │                  │
    │                │ Forward Login Req  │                  │
    │                │───────────────────>│                  │
    │                │                    │                  │
    │                │                    │  Query User      │
    │                │                    │─────────────────>│
    │                │                    │                  │
    │                │                    │  User Data       │
    │                │                    │<─────────────────│
    │                │                    │                  │
    │                │  JWT Token         │                  │
    │                │<───────────────────│                  │
    │                │                    │                  │
    │  Token + User  │                    │                  │
    │<───────────────│                    │                  │
    │                │                    │                  │
    │  Authenticated Request + Token      │                  │
    │───────────────>│                    │                  │
    │                │                    │                  │
    │                │ Forward Request + Token              │
    │                │───────────────────>│                  │
    │                │                    │                  │
    │                │                    │  Verify Token    │
    │                │                    │─────────────────>│
    │                │                    │                  │
    │                │                    │  Token Valid     │
    │                │                    │<─────────────────│
    │                │                    │                  │
    │                │  API Response      │                  │
    │                │<───────────────────│                  │
    │                │                    │                  │
    │  Response Data │                    │                  │
    │<───────────────│                    │                  │
    │                │                    │                  │
```

### Admin Authentication Special Case

For the admin user, the Express server has a special authentication flow:
1. Admin credentials are validated directly in server.js
2. A valid JWT token is generated without contacting the backend
3. The token is returned to the client with a user object
4. This allows admin login even when the backend is unavailable

## Endpoint Documentation

### Frontend Routes

| Route           | Description                                         | Auth Required |
|-----------------|-----------------------------------------------------|--------------|
| `/`             | Landing page                                         | No           |
| `/login`        | Login/registration page                              | No           |
| `/dashboard`    | Main dashboard with overall metrics                  | Yes          |
| `/diagnostics`  | Network diagnostic tools                             | Yes          |
| `/probes`       | Scheduled network probes management                  | Yes          |
| `/api-tokens`   | API token management                                 | Yes          |
| `/admin`        | Admin panel for user/subscription management         | Yes (Admin)  |
| `/profile`      | User profile management                              | Yes          |

### API Endpoints

#### Authentication Endpoints

| Endpoint         | Method | Description                          | Request Body                                | Response                                      |
|------------------|--------|--------------------------------------|---------------------------------------------|-----------------------------------------------|
| `/api/login`     | POST   | Authenticate and get token           | `{ username: string, password: string }`    | `{ access_token: string, token_type: string, user: User }` |
| `/api/logout`    | POST   | Invalidate current token             | None                                        | `{ success: boolean }`                        |
| `/api/user`      | GET    | Get current user profile             | None                                        | User object                                   |

#### Diagnostic Endpoints

| Endpoint                      | Method | Description                           | Query Params                                      | Response                        |
|-------------------------------|--------|---------------------------------------|---------------------------------------------------|--------------------------------|
| `/api/diagnostics/ping`       | GET    | Ping a host                           | `target: string`                                  | Diagnostic result object        |
| `/api/diagnostics/traceroute` | GET    | Traceroute to a target                | `target: string`                                  | Diagnostic result object        |
| `/api/diagnostics/dns`        | GET    | DNS lookup                            | `target: string, record_type: string`             | Diagnostic result object        |
| `/api/diagnostics/curl`       | POST   | HTTP request                          | `url: string, method: string, follow_redirects: boolean` | Diagnostic result object        |
| `/api/history`                | GET    | Get diagnostic history                | `limit: number, offset: number`                   | Array of diagnostic results     |

#### Probe Management

| Endpoint                    | Method | Description                        | Request/Query                                    | Response                        |
|-----------------------------|--------|------------------------------------|--------------------------------------------------|--------------------------------|
| `/api/probes`               | GET    | List scheduled probes              | `active_only: boolean`                           | Array of probe objects          |
| `/api/probes`               | POST   | Create a new scheduled probe       | Probe configuration object                       | Created probe object            |
| `/api/probes/:id`           | GET    | Get probe details                  | `id: string`                                     | Probe object                    |
| `/api/probes/:id`           | PUT    | Update probe                       | `id: string` + Probe configuration object        | Updated probe object            |
| `/api/probes/:id`           | DELETE | Delete probe                       | `id: string`                                     | `{ success: boolean }`         |
| `/api/probes/:id/activate`  | PUT    | Activate probe                     | `id: string`                                     | Updated probe object            |
| `/api/probes/:id/deactivate`| PUT    | Deactivate probe                   | `id: string`                                     | Updated probe object            |

#### API Token Management

| Endpoint                   | Method | Description                      | Request/Query                              | Response                       |
|----------------------------|--------|----------------------------------|-------------------------------------------|--------------------------------|
| `/api/keys`                | GET    | List API keys                    | None                                      | Array of API key objects       |
| `/api/keys`                | POST   | Create API key                   | `{ name: string, expires_days: number }`  | API key object with token      |
| `/api/keys/:id`            | DELETE | Delete API key                   | `id: string`                              | `{ success: boolean }`        |
| `/api/keys/:id/activate`   | PUT    | Activate API key                 | `id: string`                              | Updated API key object         |
| `/api/keys/:id/deactivate` | PUT    | Deactivate API key               | `id: string`                              | Updated API key object         |

#### Admin Endpoints

| Endpoint                     | Method | Description                     | Request/Query                               | Response                      |
|------------------------------|--------|---------------------------------|---------------------------------------------|-------------------------------|
| `/api/admin/users`           | GET    | List all users                  | `limit: number, offset: number`             | Array of user objects         |
| `/api/admin/users/:id`       | GET    | Get user details                | `id: string`                                | User object                   |
| `/api/admin/users/:id`       | PUT    | Update user                     | `id: string` + User object                  | Updated user object           |
| `/api/admin/subscriptions`   | GET    | List all subscriptions          | `limit: number, offset: number`             | Array of subscription objects |
| `/api/admin/metrics`         | GET    | Get system-wide metrics         | None                                        | Metrics object                |

## Database Schema

### Users Table

| Column           | Type          | Description                              |
|------------------|---------------|------------------------------------------|
| id               | Integer       | Primary key                              |
| username         | String        | Unique username                          |
| email            | String        | Unique email address                     |
| password         | String        | Hashed password                          |
| is_active        | Boolean       | Account status                           |
| is_admin         | Boolean       | Admin privileges                         |
| email_verified   | Boolean       | Email verification status                |
| created_at       | Timestamp     | Account creation time                    |
| updated_at       | Timestamp     | Last update time                         |

### Subscription Tiers Table

| Column                | Type          | Description                              |
|-----------------------|---------------|------------------------------------------|
| id                    | Integer       | Primary key                              |
| name                  | String        | Tier name (FREE, PRO, ENTERPRISE)        |
| description           | String        | Tier description                         |
| price_monthly         | Integer       | Monthly price in cents                   |
| price_yearly          | Integer       | Yearly price in cents                    |
| features              | JSON          | Features included in this tier           |
| max_history_days      | Integer       | History retention period                 |
| max_api_keys          | Integer       | Maximum API keys allowed                 |
| allow_api_access      | Boolean       | API access permission                    |
| allow_scheduled_probes| Boolean       | Scheduled probes permission              |
| max_scheduled_probes  | Integer       | Maximum scheduled probes                 |
| rate_limit_minute     | Integer       | Rate limit per minute                    |
| rate_limit_hour       | Integer       | Rate limit per hour                      |
| rate_limit_day        | Integer       | Rate limit per day                       |
| rate_limit_month      | Integer       | Rate limit per month                     |
| priority              | Integer       | Priority order (lower = higher priority) |

### User Subscriptions Table

| Column           | Type          | Description                              |
|------------------|---------------|------------------------------------------|
| id               | Integer       | Primary key                              |
| user_id          | Integer       | Foreign key to users table               |
| tier_id          | Integer       | Foreign key to subscription_tiers table  |
| is_active        | Boolean       | Subscription status                      |
| starts_at        | Timestamp     | Subscription start date                  |
| expires_at       | Timestamp     | Subscription expiration date (null = never) |
| payment_id       | String        | External payment reference               |
| payment_method   | String        | Payment method used                      |
| created_at       | Timestamp     | Record creation time                     |
| updated_at       | Timestamp     | Last update time                         |

### Diagnostic History Table

| Column           | Type          | Description                              |
|------------------|---------------|------------------------------------------|
| id               | Integer       | Primary key                              |
| user_id          | Integer       | Foreign key to users table               |
| tool             | String        | Diagnostic tool used                     |
| target           | String        | Target hostname/IP                       |
| result           | Text          | Diagnostic result                        |
| status           | String        | Success/Failure status                   |
| execution_time   | Integer       | Execution time in milliseconds           |
| created_at       | Timestamp     | Execution time                           |

### API Keys Table

| Column           | Type          | Description                              |
|------------------|---------------|------------------------------------------|
| id               | Integer       | Primary key                              |
| user_id          | Integer       | Foreign key to users table               |
| name             | String        | Key name/description                     |
| key              | String        | API key token (hashed)                   |
| is_active        | Boolean       | Key status                               |
| created_at       | Timestamp     | Key creation time                        |
| expires_at       | Timestamp     | Key expiration time                      |
| last_used_at     | Timestamp     | Last usage time                          |

### Scheduled Probes Table

| Column           | Type          | Description                              |
|------------------|---------------|------------------------------------------|
| id               | Integer       | Primary key                              |
| user_id          | Integer       | Foreign key to users table               |
| name             | String        | Probe name                               |
| tool             | String        | Diagnostic tool                          |
| target           | String        | Target hostname/IP                       |
| params           | JSON          | Additional parameters                    |
| interval_minutes | Integer       | Execution interval in minutes            |
| is_active        | Boolean       | Probe status                             |
| last_run_at      | Timestamp     | Last execution time                      |
| next_run_at      | Timestamp     | Next scheduled run time                  |
| created_at       | Timestamp     | Probe creation time                      |
| updated_at       | Timestamp     | Last update time                         |

## Deployment Architecture

The ProbeOps application is deployed using a combination of Docker containers and native services:

```
                  ┌───────────────────────────┐
                  │                           │
                  │  AWS/Cloud Infrastructure │
                  │                           │
                  └───────────────┬───────────┘
                                  │
                                  │
┌───────────────────┬─────────────┴──────────┬───────────────────┐
│                   │                        │                   │
▼                   ▼                        ▼                   ▼
┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ NGINX         │ │ Frontend      │ │ Backend API     │ │ PostgreSQL       │
│ Container     │ │ Container     │ │ Container       │ │ Container        │
│ - SSL         │ │ - React       │ │ - FastAPI       │ │ - Database       │
│ - Reverse     │ │ - Express     │ │ - Alembic       │ │ - Persistent     │
│   Proxy       │ │ - Static      │ │ - API Endpoints │ │   Volume         │
└───────────────┘ └───────────────┘ └─────────────────┘ └──────────────────┘
```

## Deployment Workflow

1. Code changes are pushed to the GitHub repository
2. CI/CD pipeline is triggered
3. Tests are run
4. Docker images are built
5. Images are pushed to container registry
6. `deploy.sh` script is executed on the target server:
   - Pulls latest images
   - Runs database migrations
   - Updates containers
   - Performs health checks

## Development & Troubleshooting Guidelines

### Development Guidelines

1. **Local Environment Setup**
   - Use Docker Compose for local development
   - Set up environment variables in `.env.development`
   - Run `docker-compose -f docker-compose.dev.yml up`

2. **Code Structure**
   - Follow the established directory structure
   - Create unit tests for new features
   - Document API endpoints in code comments

3. **Version Control**
   - Use feature branches for development
   - Create pull requests for code review
   - Include meaningful commit messages

4. **Database Changes**
   - Always use Alembic for migrations
   - Never modify the database directly
   - Test migrations on a development database first

### Authentication Troubleshooting

1. **JWT Token Issues**
   - Check that `JWT_SECRET` matches between frontend and backend
   - Verify token expiration times
   - Check for clock skew between servers
   - Use the auth-debug.log for detailed token information

2. **Login Failures**
   - Check browser console for errors
   - Verify credentials in the database
   - Check for account status (is_active)
   - Ensure the backend API is accessible

3. **Session Management**
   - Sessions are JWT-based, not stored in database
   - Token refresh happens automatically
   - Admin users can bypass backend auth in emergency

### API Connectivity Issues

1. **Backend Connectivity**
   - Verify the backend service is running (`docker ps`)
   - Check backend logs for errors
   - Ensure backend port (8000) is accessible
   - Check network configuration between services
   - Ensure hostname is configured correctly:
     ```javascript
     // Correct configuration
     const options = {
       hostname: '0.0.0.0',  // Use 0.0.0.0 instead of localhost
       port: 8000,
       path: '/endpoint',
       // other options...
     };
     ```

2. **Server Proxy Issues**
   - The Express server proxies requests to the backend
   - Check server.js for correct backend URL
   - Verify proxy middleware configuration
   - Use `axios` debugging for detailed request information

3. **Database Connectivity**
   - Check database connection string
   - Verify database service is running
   - Check for connection pool exhaustion
   - Monitor database performance metrics

### Deployment Troubleshooting

1. **Deployment Failures**
   - Check deploy.sh log output
   - Verify environment variables
   - Check disk space on server
   - Ensure Docker has sufficient resources

2. **Migration Issues**
   - Run migrations manually to debug
   - Use `alembic history` to check migration status
   - Consider rolling back problematic migrations
   - Always backup the database before migrations

3. **Frontend Build Issues**
   - Check Vite build logs
   - Verify node_modules dependencies
   - Test the build locally before deployment
   - Check for environment-specific configuration issues

4. **Container Issues**
   - Check container logs (`docker logs <container_id>`)
   - Verify container health (`docker ps`)
   - Check resource usage (`docker stats`)
   - Ensure volumes are correctly mounted

## Common Error Codes & Resolutions

| Error Code | Description                   | Common Causes                            | Resolution                                        |
|------------|-------------------------------|------------------------------------------|---------------------------------------------------|
| 401        | Unauthorized                  | Invalid/expired token, missing token    | Re-authenticate, check token validity             |
| 403        | Forbidden                     | Insufficient permissions                | Check user roles and subscription tier            |
| 404        | Not Found                     | Invalid endpoint, missing resource      | Check URL path, verify resource exists            |
| 422        | Validation Error              | Invalid request data                    | Check request format against API documentation    |
| 429        | Too Many Requests             | Rate limit exceeded                     | Implement backoff strategy, increase tier limits   |
| 500        | Internal Server Error         | Backend crash, database error           | Check backend logs, verify database connectivity  |
| 502        | Bad Gateway                   | Backend unavailable                     | Check if backend service is running               |
| 503        | Service Unavailable           | Backend overloaded                      | Check backend resources, scale if needed          |

## Deployment Checklist

Before deploying changes to production, ensure:

1. ✅ All tests pass in the CI/CD pipeline
2. ✅ Database migrations are tested on staging
3. ✅ Frontend builds successfully
4. ✅ API endpoints maintain backward compatibility
5. ✅ Environment variables are properly configured
6. ✅ Documentation is updated for any API changes
7. ✅ Resource requirements are evaluated
8. ✅ Backup strategy is in place
9. ✅ Rollback plan is prepared

## Monitoring & Maintenance

1. **Logs**
   - Application logs: `/var/log/probeops/`
   - NGINX logs: `/var/log/nginx/`
   - Docker logs: `docker logs <container_id>`

2. **Monitoring**
   - Database performance: Check connection pool, query times
   - API performance: Response times, error rates
   - Server resources: CPU, memory, disk usage
   - User metrics: Active users, subscription utilization

3. **Regular Maintenance**
   - Database optimization: Weekly
   - Log rotation: Daily
   - Security updates: As released
   - Feature deployments: Bi-weekly
   - Full system backups: Daily