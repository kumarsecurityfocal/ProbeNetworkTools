# ProbeOps Probe Node Connectivity Guide

## Connection Requirements

The ProbeOps probe nodes connect to the backend server using the following methods:

1. **WebSocket Connection (Primary)**
   - Protocol: WSS (WebSocket Secure)
   - Port: 443 (standard HTTPS port)
   - Direction: Outbound only from probe node to backend
   - URL Pattern: `wss://your-probeops-domain.com/ws/node`

2. **HTTPS API (Secondary)**
   - Protocol: HTTPS
   - Port: 443 (standard HTTPS port)
   - Direction: Outbound only from probe node to backend
   - URL Pattern: `https://your-probeops-domain.com/api/*`

## Addressing

Probe nodes can connect using either:

1. **FQDN (Fully Qualified Domain Name)** - Recommended
   - Example: `probeops.example.com`
   - Advantages: 
     - Allows for backend IP changes without reconfiguring nodes
     - Enables load balancing and high availability
     - Required for proper SSL/TLS certificate validation

2. **IP Address** - Alternative
   - Example: `203.0.113.42`
   - Advantages:
     - Works when DNS resolution is not available
     - May be required in certain restricted networks
   - Disadvantages:
     - SSL certificate validation issues unless using IP SAN certificates
     - No automatic failover if backend IP changes

## Firewall Configuration

For the probe node to operate properly, you need to ensure:

1. **Outbound access** from the probe node to the ProbeOps backend on port 443 (TCP)

2. No **inbound ports** need to be opened on the probe node itself, as all communications are initiated outbound from the probe

## Network Requirements

1. **Bandwidth**: Minimal; primarily text-based JSON payloads
   - Average usage: ~1-5 MB/hour per node
   - Peak usage during large diagnostic results: ~20 MB/hour

2. **Latency**: Connection is resilient to higher latencies, but lower is better
   - Recommended: <200ms for optimal responsiveness
   - Maximum: <2000ms (2 seconds) for reliable operation

3. **Proxy Support**: 
   - HTTP proxies supported via configuration
   - SOCKS proxies supported via configuration

## Example Configuration

```bash
# Using FQDN (recommended)
export PROBEOPS_BACKEND_URL="https://probeops.example.com"

# Using IP address (alternative)
export PROBEOPS_BACKEND_URL="https://203.0.113.42"

# Using custom port (if not using standard 443)
export PROBEOPS_BACKEND_URL="https://probeops.example.com:8443"

# When behind HTTP proxy
export HTTPS_PROXY="http://proxy.internal:8080"
export NO_PROXY="localhost,127.0.0.1,internal.example.com"
```

## Testing Connectivity

You can test connectivity to the ProbeOps backend using:

```bash
# Test HTTPS connectivity
curl -v https://probeops.example.com/api/health

# Test WebSocket connectivity
wscat -c wss://probeops.example.com/ws/node
```

## Troubleshooting

If connectivity issues occur:

1. Verify network routes using traceroute:
   ```
   traceroute probeops.example.com
   ```

2. Check DNS resolution:
   ```
   nslookup probeops.example.com
   ```

3. Test TLS handshake:
   ```
   openssl s_client -connect probeops.example.com:443
   ```

4. Verify proxy configuration (if applicable):
   ```
   curl -v --proxy http://proxy.internal:8080 https://probeops.example.com/api/health
   ```