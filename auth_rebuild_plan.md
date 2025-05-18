# Final Containerized Authentication Rebuild Plan

## Infrastructure Components

1. **AWS RDS PostgreSQL Database**
   - Managed PostgreSQL instance with proper VPC security
   - Connection via DATABASE_URL environment variable
   - Backup strategy for migration safety

2. **Backend Container with Auth Bypass**
   - Python 3.11 + FastAPI
   - Auth bypass controlled strictly via `AUTH_BYPASS=true` environment variable
   - Clear isolation between dev and production builds
   - Connects to AWS RDS

3. **Clean API Proxy Container**
   - Node.js proxy server
   - Simple request forwarding without auth logic
   - Exposed on port 5000

4. **Direct Frontend Container**
   - Node.js + Vite for development
   - Development-specific authentication debugging tools
   - Mock login flows and token inspection in development

5. **Probe Node Container**
   - Network diagnostic capabilities
   - Secure API communication
   - Deployment flexibility

6. **AWS Application Load Balancer**
   - Production traffic routing
   - SSL termination
   - Path-based routing

## Role-Based Access Control (RBAC)

1. **Role Definitions**
   - Admin: Full system access
   - Standard: Limited user functionality
   - Probe: Network diagnostic permissions only

2. **Permission Implementation**
   - Pydantic token payloads with role and scope fields
   - FastAPI dependency injection based on permission requirements
   - Clear permission boundaries between roles
   - Role validation on all protected endpoints

3. **Token Structure**
   - JWT with role, scope, and permission claims
   - Consistent token structure across all authentication types
   - Proper token validation and security measures

## Database Migration Strategy with Alembic

1. **Alembic Configuration**
   - Automatic revision hash generation
   - Pre-validation of migrations before deployment
   - Auto-merging of Alembic heads when needed

2. **Migration Safety**
   - Pre-migration database backup
   - Transaction-based migrations with rollback
   - Explicit validation steps in CI/CD
   - Migration failure detection and recovery

3. **Migration Process**
   - CI/CD integration with migration validation
   - Alembic checks before deployment
   - Automated rollback on failure
   - Migration success verification

## Layer Rebuilding Approach

### Phase 1: Development Environment Setup

1. **Docker Compose for Development**
   - Complete development environment with `docker-compose.dev.yml`
   - `AUTH_BYPASS=true` only in development composition
   - AWS RDS connection configuration
   - Local probe node for testing

2. **Backend Auth Bypass Implementation**
   - Environment-controlled bypass via `AUTH_BYPASS=true`
   - Never deployable to production environments
   - Admin authentication for development
   - Comprehensive authentication logging

3. **Frontend Auth Debugging Tools**
   - Token inspection via browser console
   - Development-only `/debug-auth` UI route
   - Mock login flows for testing
   - Authentication state visualization

4. **Probe Node Development Setup**
   - Local testing configuration
   - Authentication bypass clearly marked for development

### Phase 2: Clean Authentication Implementation

1. **Backend Auth Layer**
   - Comprehensive JWT implementation
   - Token validation with proper security
   - RBAC via Pydantic models and dependency injection
   - Token management for all user types

2. **Frontend Auth Layer**
   - Robust AuthContext provider
   - Secure token storage strategy
   - Clear authentication state management
   - Protected route implementation

3. **Probe Node Authentication**
   - Initial registration using admin-issued token
   - JWT-based authentication consistent with main application
   - Certificate or API key exchange during registration
   - Secure communication channel establishment
   - Limited permission scope for probe operations

### Phase 3: Production Configuration

1. **Production Docker Compose**
   - `docker-compose.prod.yml` with production settings
   - Auth bypass explicitly disabled
   - Health check implementation
   - Resource limit configuration

2. **CI/CD Pipeline Updates**
   - Automated build and test processes
   - AWS deployment configuration
   - Alembic migration validation and execution
   - Probe node deployment automation

3. **AWS Deployment Configuration**
   - ECS task definitions
   - Load balancer configuration
   - Auto-scaling policies
   - Monitoring setup

### Phase 4: Probe Node Network

1. **Probe Node Registration**
   - Admin-generated registration tokens
   - Secure registration workflow
   - Certificate or API key exchange
   - Automated authentication configuration

2. **Probe Management Interface**
   - Administrative UI for probe management
   - Deployment and configuration tools
   - Authentication and access control
   - Monitoring dashboards

3. **Probe API Security**
   - Rate limiting on registration endpoints
   - Secure API endpoints for probe communication
   - Authentication token validation
   - Data validation and sanitization

### Phase 5: Deployment & Verification

1. **Database Migration Automation**
   - Alembic integration in CI/CD
   - Pre-deployment validation
   - Automatic rollback procedures
   - Schema verification steps

2. **Deployment Process**
   - Blue/green deployment strategy
   - Automated testing
   - Gradual traffic shifting
   - Connection verification

3. **Security Measures**
   - Rate limiting on login and registration endpoints
   - Token handling security audit
   - Database access control verification
   - Probe communication security validation
   - Regular security scanning