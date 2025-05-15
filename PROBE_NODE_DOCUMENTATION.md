# ProbeOps Distributed Probe Node System Documentation

## Overview

The ProbeOps distributed probe node system enables network diagnostics to be performed from multiple geographic locations around the world. This distributed architecture provides several benefits:

1. **Geographic Distribution**: Run network tests from different regions to identify regional connectivity issues
2. **Horizontal Scalability**: Add more nodes to handle increased diagnostic load
3. **High Availability**: Maintain service when individual nodes go offline
4. **Load Balancing**: Distribute workloads based on node capacity and health

This document provides comprehensive technical details about the node structure, registration process, security model, and end-to-end functionality.

## System Architecture

### Components

The distributed probe system consists of these key components:

1. **Central API Server**: Manages node registration, configuration, and orchestrates diagnostic requests
2. **Probe Nodes**: Distributed agents that perform network diagnostics
3. **Registration System**: Secure onboarding process for new nodes
4. **Load Balancer**: Intelligent routing of diagnostic requests to appropriate nodes
5. **Health Monitoring**: Continuous tracking of node health and availability

### Data Flow

1. **Registration**: New nodes register using secure registration tokens
2. **Configuration**: Nodes receive and store their configuration
3. **Heartbeat**: Nodes regularly report their status to the central server
4. **Request Routing**: Diagnostic requests are routed to appropriate nodes
5. **Result Collection**: Diagnostic results are returned to the central server

## Node Registration Process

### Creating Registration Tokens

1. Administrators generate time-limited registration tokens through the admin interface
2. Each token includes:
   - Unique identifier
   - Expiration time (typically 24 hours)
   - Optional regional designation
   - Description for administrative tracking

### Node Registration Flow

1. A new probe node requests registration using the token
2. The server validates the token and creates a node record
3. The server generates a unique API key for ongoing node authentication
4. The node stores its configuration including the API key
5. The registration token is marked as used and linked to the new node

## Security Model

### Authentication

1. **Registration Phase**: One-time registration tokens with expiration
2. **Operational Phase**: Unique API keys for each node
3. **Administrative Actions**: JWT-based authentication for admin operations

### Data Protection

1. All node-server communication occurs over HTTPS
2. API keys are stored securely on nodes using environment variables
3. Node metadata is encrypted when containing sensitive information

### Access Control

1. Nodes can only access their own configuration
2. Diagnostic requests are validated against subscription tier limits
3. Administrative actions on nodes require admin privileges

## Node Implementation

### Hardware Requirements

- Minimum: 1 CPU core, 512MB RAM, 1GB storage
- Recommended: 2+ CPU cores, 2GB RAM, 10GB storage
- Network: Stable internet connection with public IP

### Software Components

1. **Core Agent**: Python-based service that handles the main probe functionality
2. **Diagnostic Tools**: Specialized modules for different diagnostic types
3. **Configuration Manager**: Handles secure storage and updates of configuration
4. **Scheduler**: Manages execution of scheduled probes
5. **Healthcheck**: Reports node status and metrics

### Lifecycle Management

1. **Startup**: Node automatically connects to central server on startup
2. **Configuration Sync**: Node pulls latest configuration from server
3. **Operation**: Node executes diagnostic requests as directed
4. **Updates**: Node handles graceful updates when new versions are available
5. **Shutdown**: Node reports status before shutdown

## Load Balancing

### Balancing Strategies

The system supports multiple load balancing strategies:

1. **Round-robin**: Evenly distribute requests across all available nodes
2. **Load-based**: Route requests to nodes with lowest current workload
3. **Capability-based**: Send requests to nodes supporting the required tools
4. **Regional**: Route requests to nodes in specific geographic regions
5. **Hybrid**: Combine multiple strategies for optimal distribution

### Prioritization

1. Nodes have configurable priority levels (1-100)
2. Higher priority nodes receive requests before lower priority ones
3. Premium subscription tiers can be assigned to specific high-priority nodes

## Node Monitoring and Management

### Health Metrics

Nodes report the following metrics:

1. **Current Load**: CPU/Memory utilization (0.0-1.0)
2. **Response Time**: Average time to complete diagnostics
3. **Error Rate**: Percentage of failed diagnostics
4. **Connectivity**: Connection quality to key internet services
5. **Total Probes**: Number of diagnostics executed

### Administrative Controls

Administrators can perform these actions on nodes:

1. **Enable/Disable**: Temporarily remove node from the active pool
2. **Configure**: Update node settings and capabilities
3. **Delete**: Permanently remove a node
4. **View Logs**: Access diagnostic logs for troubleshooting
5. **Force Sync**: Trigger immediate configuration synchronization

## Offline Operation

Nodes are designed to operate in partially-disconnected scenarios:

1. Local configuration is cached for continued operation if disconnected
2. Scheduled probes continue to run according to their configuration
3. Results are stored locally until connectivity is restored
4. Automatic reconnection is attempted at regular intervals
5. Gradual backoff prevents overwhelming the server during recovery

## Implementation Guidelines

### Deploying New Nodes

To deploy a new probe node:

1. Generate a registration token in the admin interface
2. Deploy the probe node software with the token
3. The node will automatically register and appear in the management console
4. Verify the node's health status and capabilities
5. Enable the node to start receiving diagnostic requests

### Configuration Best Practices

1. Deploy nodes in diverse geographic regions
2. Distribute nodes across different network providers
3. Configure nodes with appropriate capabilities for their hardware
4. Set appropriate concurrency limits based on available resources
5. Use descriptive naming conventions for easier management

## API Reference

### Node Registration

```
POST /api/nodes/register
{
  "registration_token": "token_value",
  "name": "node_name",
  "hostname": "node.example.com",
  "region": "us-east-1",
  "supported_tools": {
    "ping": true,
    "traceroute": true,
    "dns": true,
    "http": true
  }
}
```

### Node Heartbeat

```
POST /api/nodes/{node_uuid}/heartbeat
{
  "current_load": 0.25,
  "avg_response_time": 150.5,
  "error_count": 0,
  "version": "1.0.5"
}
```

### Execute Diagnostic on Node

```
POST /api/nodes/{node_uuid}/execute
{
  "tool": "ping",
  "target": "example.com",
  "parameters": {
    "count": 4,
    "timeout": 5
  }
}
```

## Troubleshooting

### Common Issues

1. **Registration Failures**: Usually due to expired tokens or network issues
2. **Missing Heartbeats**: May indicate network connectivity problems
3. **High Error Rates**: Often caused by misconfigured diagnostic tools
4. **Performance Degradation**: Usually from resource constraints on the node
5. **Node Disappearance**: Could be network issues or node process termination

### Diagnostic Steps

1. Verify node connectivity to the central server
2. Check node logs for specific error messages
3. Confirm the node's API key is valid and not expired
4. Verify the node has the required permissions
5. Ensure the node has sufficient resources for its configuration

## Future Enhancements

Planned enhancements for the probe node system include:

1. **Auto-scaling**: Automatically deploy new nodes during high demand
2. **Predictive Routing**: Use historical performance to optimize request routing
3. **Advanced Analytics**: Deeper insights into node performance patterns
4. **Custom Tool Support**: Allow nodes to support custom diagnostic tools
5. **Cross-node Correlation**: Compare results across multiple nodes automatically

## Conclusion

The distributed probe node system is a core component of ProbeOps, enabling highly available, geographically distributed network diagnostics. By following this documentation, administrators can effectively deploy, manage, and troubleshoot their probe node infrastructure.