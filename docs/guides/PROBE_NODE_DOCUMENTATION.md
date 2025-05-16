# ProbeOps Probe Node Documentation

## Introduction

ProbeOps implements a Zero Trust Network Access (ZTNA) architecture for its probe nodes. This approach provides enhanced security and operational benefits:

- **Outbound-only connections**: Probe nodes only establish outbound connections to the ProbeOps backend, eliminating the need to expose inbound ports
- **Real-time bidirectional communication**: WebSockets enable instant command delivery without polling
- **Works behind firewalls/NAT**: Nodes can operate within private networks
- **Enhanced resiliency**: Automatic reconnection with exponential backoff

## Architecture Overview

The ProbeOps ZTNA architecture consists of these key components:

1. **Backend WebSocket Server** - Provides the WebSocket endpoint at `/ws/node` for probe nodes to connect
2. **Probe Node WebSocket Client** - Establishes and maintains secure connections to the backend
3. **Diagnostic Command Execution** - Runs network diagnostics and sends results back to the server
4. **Authentication & Security** - API key-based authentication and TLS encryption

## Setting Up a Probe Node

### Prerequisites

- Python 3.7 or higher
- Network connectivity to the ProbeOps backend server
- A valid node UUID and API key from ProbeOps

### Installation

1. Clone or download the probe node code from the ProbeOps repository
2. Install required dependencies:

```bash
cd probe
pip install -r requirements.txt
```

### Configuration

Configure the probe node using environment variables or command-line arguments:

**Environment Variables:**
```bash
export PROBEOPS_BACKEND_URL="https://probeops.com"
export PROBEOPS_NODE_UUID="your-node-uuid"
export PROBEOPS_API_KEY="your-api-key"
export PROBEOPS_HEARTBEAT_INTERVAL="15"  # Optional, in seconds
```

**Command-line Arguments:**
```bash
python run_probe_node.py --backend https://probeops.com --uuid your-node-uuid --key your-api-key
```

### Running the Probe Node

#### Manual Execution

Start the WebSocket client with:

```bash
python run_probe_node.py
```

#### Docker Deployment (Recommended)

For production deployments, we recommend using the provided `deploy-probe.sh` script which uses Docker Compose to run the probe node in a containerized environment:

1. Set the required environment variables:

```bash
export PROBEOPS_BACKEND_URL="https://probeops.com"
export PROBEOPS_NODE_UUID="your-node-uuid"
export PROBEOPS_API_KEY="your-api-key"
```

2. Run the deployment script:

```bash
./deploy-probe.sh
```

The script will:
- Check if Docker and Docker Compose are installed (and install them if needed)
- Create the required environment file
- Pull the latest probe node code
- Build and start the Docker container
- Set up automatic restart on system reboot

3. Verify the deployment:

```bash
docker compose -f docker-compose.probe.yml ps
docker compose -f docker-compose.probe.yml logs
```

#### Alternative Deployment Options

For deployment without Docker, use a process manager like systemd, supervisor, or PM2 to ensure the client stays running.

## WebSocket Protocol

### Connection Establishment

1. The probe node initiates an outbound WebSocket connection to `wss://probeops.com/ws/node`
2. The node sends an authentication message containing its UUID and API key
3. The server validates the credentials and accepts the connection
4. The server tracks the node's connection status in the database

### Message Types

All messages use JSON format:

#### Client → Server:
- **Authentication**: `{"node_uuid": "uuid", "api_key": "key", "version": "1.0.0", "hostname": "node01"}`
- **Heartbeat**: `{"type": "heartbeat", "node_uuid": "uuid", "current_load": 0.25, ...}`
- **Diagnostic Result**: `{"type": "diagnostic_response", "request_id": "req123", "result": {...}}`

#### Server → Client:
- **Authentication Response**: `{"status": "connected", "connection_id": "conn123", ...}`
- **Heartbeat Acknowledgment**: `{"type": "heartbeat_ack", "timestamp": "2025-01-01T12:00:00Z"}`
- **Diagnostic Job**: `{"type": "diagnostic_job", "request_id": "req123", "tool": "ping", "target": "example.com", ...}`

### Reconnection Strategy

The client implements exponential backoff for reconnection attempts:

1. Initial delay: 1 second
2. Each subsequent attempt: previous delay * 1.5 (configurable factor)
3. Maximum delay: 30 seconds (configurable)
4. Added jitter: ±10% to prevent thundering herd problems

## Security Considerations

- **TLS Encryption**: All WebSocket connections use TLS (wss://)
- **API Key Authentication**: Each node has a unique API key
- **Limited Scope**: Probe nodes only have access to diagnostic commands
- **Secure Registration**: Nodes are registered through a secure process with limited-use registration tokens

## Troubleshooting

### Common Issues

**Connection Failures:**
- Verify network connectivity to the backend URL
- Check if the API key and node UUID are correct
- Ensure the backend server is running and accepting WebSocket connections

**Authentication Failures:**
- Verify the API key is valid and not expired
- Check if the node has been deactivated in the management console

**Intermittent Disconnections:**
- Check for network stability issues
- Verify server health and load
- Review logs for timeout errors

### Logging

The probe client logs detailed connection information:

```bash
# Enable verbose logging
python run_probe_node.py --verbose
```

## Advanced Configuration

### Custom SSL Context

For environments with special SSL requirements:

```python
import ssl

# Create custom SSL context
context = ssl.create_default_context()
context.load_verify_locations('/path/to/custom/ca.pem')

# Initialize client with custom context
client = ProbeNodeWSClient(
    backend_url=backend_url,
    node_uuid=node_uuid,
    api_key=api_key,
    ssl_context=context
)
```

### Custom Diagnostic Tools

You can implement custom diagnostic tools by providing a custom tools handler:

```python
async def my_custom_tools_handler(tool, target, parameters, timeout):
    if tool == "my_custom_tool":
        # Implement custom diagnostic
        return {"success": True, "data": "custom results"}
    else:
        # Use default implementation for other tools
        return await execute_diagnostic_tool(tool, target, parameters, timeout)

# Initialize client with custom handler
client = ProbeNodeWSClient(
    backend_url=backend_url,
    node_uuid=node_uuid,
    api_key=api_key,
    tools_handler=my_custom_tools_handler
)
```

## API Reference

See the code documentation for detailed API references:

- `ws_client.py` - WebSocket client implementation
- `run_probe_node.py` - Command-line launcher
- `utils.py` - Diagnostic tool implementations
- `probe.py` - Standalone agent implementation