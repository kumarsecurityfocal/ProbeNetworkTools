# ProbeOps Authentication System Rebuild Plan

## Overview

This document outlines the comprehensive plan for rebuilding the ProbeOps authentication system. The current JWT-based authentication system has several issues that need to be addressed, including token handling, security concerns, and integration with other services.

## Current Issues

1. **Token Management**: Inconsistent token handling between frontend and backend
2. **Security Vulnerabilities**: Improper JWT validation and secret management
3. **Role-Based Access Control**: Insufficient permission checking
4. **Probe Authentication**: Insecure probe registration and communication
5. **Database Migrations**: Schema version mismatches and migration failures
6. **Error Handling**: Poor error reporting for authentication failures

## Rebuild Approach

The authentication rebuild will follow a phased approach to minimize disruption to existing services while implementing a more robust and secure system.

### Phase 1: Development Environment with Auth Bypass

**Objective**: Create a containerized development environment that bypasses authentication for easier development and testing.

**Components**:

1. **Auth Bypass System**:
   - Backend (`auth_bypass.py`): Auto-authenticates all requests as admin
   - Proxy (`server.clean.js`): Simple API forwarding without token handling
   - Frontend debugging tools to visualize authentication state

2. **Containerized Setup**:
   - Docker Compose configuration for isolated development
   - Separate containers for Backend, API Proxy, Frontend, and Probe Node
   - Environment variables to control auth bypass mode

3. **Toggle Scripts**:
   - `activate_auth_bypass.sh`: Enables auth bypass mode
   - `deactivate_auth_bypass.sh`: Restores standard authentication
   - `toggle_auth_bypass.sh`: Toggles between modes

4. **Documentation**:
   - Usage instructions for auth bypass
   - Development workflow guidelines
   - Deployment guidance for EC2

### Phase 2: Clean Authentication Implementation

**Objective**: Implement a properly designed authentication system with secure token handling and role-based access control.

**Components**:

1. **Backend Authentication**:
   - JWT implementation with proper validation
   - Secure secret management
   - Token refresh mechanism
   - Rate limiting for login endpoints

2. **Role-Based Access Control**:
   - Admin role with full system access
   - Standard user role with limited permissions
   - Probe role for network diagnostic nodes
   - Permission middleware for API routes

3. **Frontend Authentication**:
   - Proper token storage and management
   - Automatic token refresh
   - Role-based UI rendering
   - Session timeout handling

4. **Probe Authentication**:
   - Secure probe registration process
   - Dedicated probe authentication flow
   - Probe-specific token management

5. **Database Schema**:
   - Updated user model with role information
   - Permission table for fine-grained access control
   - Token tracking for auditing purposes

### Phase 3: Production Deployment with Migration Path

**Objective**: Deploy the new authentication system to production with a smooth migration path from the old system.

**Components**:

1. **Migration Tools**:
   - Database schema migration scripts
   - Token conversion utilities
   - User role assignment tool

2. **Deployment Process**:
   - Blue-green deployment strategy
   - Monitoring for authentication failures
   - Rollback procedure

3. **Security Enhancements**:
   - API rate limiting
   - Account lockout after failed attempts
   - Audit logging for authentication events

4. **Documentation**:
   - Admin user guides
   - Security practices
   - Maintenance procedures

## Implementation Details

### Auth Bypass Mode

Auth bypass mode enables development without authentication by:

1. Replacing `auth.py` with `auth_bypass.py` that auto-authenticates as admin
2. Using `server.clean.js` as a simple proxy without token validation
3. Setting `AUTH_BYPASS=true` in environment variables

To activate:
```bash
./activate_auth_bypass.sh
```

To deactivate:
```bash
./deactivate_auth_bypass.sh
```

### New Authentication System

The new system will use:

1. **JWT Tokens**:
   - Short-lived access tokens (1 hour)
   - Longer-lived refresh tokens (7 days)
   - Proper signature validation

2. **Token Storage**:
   - Access token in memory (or secure cookie)
   - Refresh token in HTTP-only cookie
   - No sensitive data in localStorage

3. **Role-Based Permissions**:
   - Each route explicitly defines required permissions
   - Permission checking middleware
   - Role hierarchy (admin > standard > probe)

### Database Schema Changes

```sql
-- User schema with role information
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions mapping
CREATE TABLE role_permissions (
    role VARCHAR(50) NOT NULL,
    permission_id INTEGER REFERENCES permissions(id),
    PRIMARY KEY (role, permission_id)
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);
```

## Timeline

1. **Phase 1** (Week 1-2):
   - Containerized development environment
   - Auth bypass implementation
   - Development tools and scripts

2. **Phase 2** (Week 3-5):
   - Backend JWT implementation
   - Role-based access control
   - Frontend authentication
   - Probe authentication

3. **Phase 3** (Week 6-7):
   - Migration tools
   - Testing in staging environment
   - Production deployment
   - Documentation and training

## Risk Management

1. **Data Migration**:
   - Backup all user data before migration
   - Test migration process in staging
   - Provide rollback capability

2. **Service Disruption**:
   - Implement changes during low-traffic periods
   - Use blue-green deployment to minimize downtime
   - Monitor authentication metrics closely

3. **Security Risks**:
   - Conduct security audit before production
   - Implement rate limiting to prevent brute force
   - Set up monitoring for suspicious activities

## Success Criteria

1. All authentication-related errors are resolved
2. Role-based access control works correctly
3. Probe nodes authenticate securely
4. Database migrations run successfully
5. No disruption to user experience during transition
6. Improved security posture

## Conclusion

This authentication rebuild plan provides a structured approach to addressing the current issues while maintaining system stability. By following the phased implementation, we can ensure a smooth transition to a more robust and secure authentication system.