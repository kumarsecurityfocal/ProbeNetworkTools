# ProbeOps Authentication Bypass System

This guide explains how to use the authentication bypass system for development purposes.

## Overview

The auth bypass system allows developers to:

- Skip authentication during development
- Automatically log in as the admin user
- Use a clean API proxy without complex token handling
- Debug authentication state with visual tools
- Toggle between auth bypass and standard auth modes

## Available Tools

1. **Docker Containerized Development Environment**
   - `docker-compose.auth-bypass.yml` - Complete development environment with auth bypass

2. **Auth Bypass Scripts**
   - `activate_auth_bypass.sh` - Enables auth bypass mode
   - `deactivate_auth_bypass.sh` - Restores standard authentication
   - `toggle_auth_bypass.sh` - Toggles between auth bypass and standard modes
   - `restart_workflows_with_auth_bypass.sh` - Restarts workflows with auth bypass

3. **Frontend Debugging Tools**
   - Auth debug panel for visualizing authentication state
   - Console debug utilities for authentication troubleshooting

## Quickstart Guide

### Option 1: Docker Containerized Development

1. Start the containerized development environment:
   ```bash
   docker-compose -f docker-compose.auth-bypass.yml up -d
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - API Proxy: http://localhost:5000
   - Backend API: http://localhost:8000
   - Probe Node: http://localhost:9000

3. Stop the environment when finished:
   ```bash
   docker-compose -f docker-compose.auth-bypass.yml down
   ```

### Option 2: Direct Workflow Activation

1. Activate auth bypass mode:
   ```bash
   ./activate_auth_bypass.sh
   ```

2. Restart the workflows:
   ```bash
   ./restart_dev_workflows.sh
   ```

3. When finished, deactivate auth bypass:
   ```bash
   ./deactivate_auth_bypass.sh
   ```

4. Return to standard authentication:
   ```bash
   ./restart_production_workflows.sh
   ```

## Authentication Debug Panel

In development mode with auth bypass enabled, you'll see a debug panel in the bottom-right corner of the screen that shows:

- Authentication status
- Admin status
- User information
- Token details (expandable)

You can:
- Toggle the panel visibility
- Expand/collapse detailed information
- Hide the panel (a button will appear to show it again)

## How Auth Bypass Works

1. **Backend**: `auth_bypass.py` replaces `auth.py` to automatically use the admin account for all requests
2. **Server**: `server.clean.js` provides simple API proxying without token handling
3. **Frontend**: Auth debugging tools visualize authentication state

## Development Guidelines

- **Never** deploy code with auth bypass enabled to production
- **Always** use `deactivate_auth_bypass.sh` before committing code
- Use the auth debug panel to verify authentication state during development
- Remember that auth bypass only works in development environments

## Troubleshooting

If you encounter issues with auth bypass:

1. Check the logs in `backend_auth_bypass.log` and `server_auth_bypass.log`
2. Verify that the admin user exists in the database
3. Ensure the AUTH_BYPASS environment variable is set to `true`
4. Try restarting the workflows with `restart_dev_workflows.sh`

For more information, see the detailed authentication rebuild plan in `auth_rebuild_plan.md`.