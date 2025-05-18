# ProbeOps Diagnostic Tools

This documentation covers the ProbeOps diagnostic tools designed to help troubleshoot authentication and system issues in both development and production environments.

## Overview

The diagnostic toolkit provides:

1. Comprehensive logging capabilities
2. Authentication monitoring
3. Database connection verification
4. System status monitoring
5. A secure dashboard interface

These tools are designed to be integrated with your existing deployment pipeline and can be enabled on demand in production without compromising security.

## Components

### 1. Debug Collector (`debug-collector.js`)

A standalone Node.js script that collects comprehensive diagnostic information:

- System information (Docker, Node.js, memory usage)
- Container logs from all microservices
- Network configuration
- Database connectivity and schema
- JWT token and auth configuration
- API endpoint testing

### 2. Diagnostic Dashboard (`diagnostic-dashboard.js`)

A web-based dashboard accessible via `/diagnostics` that provides:

- Real-time system status monitoring
- Authentication testing interface
- Log collection and viewing
- Database connection testing
- JWT configuration checking
- Service restart capabilities

### 3. Integration Script (`scripts/diagnostics-setup.sh`)

Automates setup and integration of diagnostic tools into your existing infrastructure:

- Configures necessary directories and files
- Creates Docker container for the diagnostic service
- Sets up Nginx routing with appropriate security restrictions
- Allows easy updating of diagnostic tools

## Secure Deployment

The diagnostic tools are designed with security in mind:

- Dashboard access is restricted by:
  - Password protection
  - IP address restrictions (only local/private networks)
  - HTTPS encryption
- Sensitive data is masked in logs (passwords, tokens, etc.)
- No modifications to application code required

## Integration with CI/CD

The diagnostic tools can be incorporated into your existing deployment pipeline:

1. Add the tools to your repository
2. Include the setup script in your deploy.sh file
3. Enable diagnostics only when needed with an environment variable

## Usage Instructions

### Setting Up in Production

1. Copy the diagnostic files to your repository:
   - `debug-collector.js`
   - `diagnostic-dashboard.js`
   - `scripts/diagnostics-setup.sh`

2. Update your deploy.sh script to include the diagnostic setup (see deploy-diagnostics.sh for examples)

3. Enable diagnostics on your next deployment:
   ```bash
   SETUP_DIAGNOSTICS=true ./deploy.sh
   ```

### Accessing the Dashboard

Once deployed, access the dashboard at:
```
https://your-domain.com/diagnostics
```

The default password is `probeops-diagnostics` but should be changed via the `DIAGNOSTIC_PASSWORD` environment variable.

### Using the Debug Collector Standalone

The debug collector can also be run directly:

```bash
node debug-collector.js
```

This will generate a comprehensive log file in the `debug-logs` directory.

## Troubleshooting Authentication Issues

### Common Issues and Solutions

1. **Token Generation Problems**
   - Check JWT secret configuration in backend
   - Verify token creation logic in auth services
   - Confirm proper header usage in frontend API calls

2. **Database Identity Issues**
   - Verify user IDs match between token and database
   - Check for database schema migration issues
   - Confirm foreign key relationships

3. **Session Persistence Problems**
   - Check token storage in browser (localStorage vs cookies)
   - Verify token expiration handling
   - Test token refresh mechanisms

### Analyzing Logs

The diagnostic tools generate structured logs that help identify issues:

- Authentication flows are fully traced
- Database queries are logged with timing information
- Network requests are captured with headers and response codes
- System resource information helps identify performance bottlenecks

## Security Considerations

1. **Access Control**
   - The diagnostic dashboard should only be enabled when needed
   - IP restrictions should be configured appropriately
   - Strong password should be used

2. **Data Protection**
   - All sensitive data is masked in logs
   - No PII is exposed in diagnostic information
   - Logs should be retained only as long as needed

3. **Network Security**
   - Dashboard should only be accessible via HTTPS
   - Internal service communication should use secure channels
   - Firewall rules should restrict access appropriately

## Updating the Tools

The diagnostic tools can be updated to newer versions:

1. Through the dashboard interface
2. By updating the files in your repository
3. By re-running the setup script

## Support

For questions or issues with the diagnostic tools, please contact the ProbeOps development team.