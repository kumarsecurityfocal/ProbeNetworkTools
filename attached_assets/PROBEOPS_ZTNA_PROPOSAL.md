
# ProbeOps ZTNA-Enhanced Architecture Proposal (v2.0)

## Key Upgrade: ZTNA-Style Real-Time Communication Model

To enable real-time diagnostics from private, non-public probe nodes (like a ZTNA connector), this revised architecture introduces a persistent, outbound-only communication tunnel (WebSocket) from each probe node to the central API server. This ensures:
- No public exposure of nodes
- Real-time diagnostics
- ZTNA-style zero trust relay model

---

## Updated System Components

1. **Central API Server** (Replit-deployable FastAPI)
   - Manages incoming user API requests
   - Maintains real-time WebSocket channels to registered probe nodes
   - Handles authentication, authorization, request routing

2. **Probe Nodes** (Replit or lightweight VPS)
   - Connect to central server via WebSocket
   - Wait for probe instructions
   - Perform diagnostic and return results over the same channel

3. **Secure Control Channel**
   - Built using `wss://` WebSocket tunnel from each probe
   - Authenticated using probe API key or JWT
   - Load-balanced internally (per region, capability, and health)

---

## Real-Time Data Flow

```text
[User API Request (curl/n8n)]
        |
        v
  [FastAPI API Server (public HTTPS)]
        |
        v
  [Route request to appropriate probe node (based on region/load)]
        |
        v
  [Send probe job via WebSocket to probe node]
        |
        v
  [Node executes diagnostic, sends result via WebSocket]
        |
        v
  [API server returns result to user in real-time]
```

---

## Changes to Node Lifecycle

### Additional Lifecycle Events
- **WebSocket Connect**: Upon startup, node authenticates and opens a persistent `wss://` connection
- **Probe Job Handling**: Node listens for probe jobs and immediately executes when received
- **Result Push**: Node pushes JSON result over the same connection
- **Reconnection Logic**: If WS disconnects, backoff and reconnect (resilience)

### Updated Node Software Components

- `ws_client.py`: Handles WebSocket connection to API server
- `diagnostic_runner.py`: Executes commands like ping, traceroute, etc.
- `auth_manager.py`: Handles API key-based authentication

---

## Revised Endpoint Definitions

### New: WebSocket Control Channel
- `wss://api.probeops.com/ws/node`
- Auth header: `Authorization: Bearer <node_api_key>`

**Server Push Format:**
```json
{
  "request_id": "uuid-xyz",
  "tool": "ping",
  "target": "example.com",
  "parameters": {"count": 4, "timeout": 5}
}
```

**Probe Response Format:**
```json
{
  "request_id": "uuid-xyz",
  "status": "success",
  "output": "Ping result...",
  "duration_ms": 420
}
```

---

## Security Model (ZTNA Aligned)

- **Zero inbound ports on probes**: All traffic is initiated outbound
- **All node-server communication is encrypted (TLS)**
- **Access control via API key per probe**
- **Job isolation using request IDs**
- **Audit trail of all API and probe actions**

---

## Deployment Notes for Replit

- Use `websockets` or `FastAPI WebSocketRoute` to implement control server
- Deploy central server as Replit web project (TLS handled automatically)
- Use Replit secrets for storing API keys securely in environment
- Use `asyncio` in node code for persistent WS + job execution

---

## Diagram

```
                     ┌────────────────────┐
                     │  User (curl/n8n)   │
                     └────────┬───────────┘
                              │
                     ┌────────▼─────────────┐
                     │   FastAPI API Server │◄─────┐
                     └────────┬─────────────┘      │
                              │                    │
     ┌────────────────────────▼────┐       ┌───────▼────────────────┐
     │   WebSocket Control Manager │       │ Job Router & Responder │
     └────────────┬───────────────┘       └─────────────────────────┘
                  │                                  ▲
    ┌─────────────▼────────────┐     ┌───────────────┴────────────┐
    │ Probe Node (us-east)     │     │ Probe Node (eu-central)     │
    └──────────────────────────┘     └────────────────────────────┘
```

---

## Next Steps

1. Implement WebSocket endpoint in FastAPI central server
2. Update node agent to maintain persistent WS connection
3. Add request routing logic to match user request → region → connected probe
4. Log all user-to-node transactions for audit/compliance
5. Enforce rate limits + authorization at API layer

---

Let me know if you want the Python code for the FastAPI WebSocket server + the `ws_client.py` for the probe node. This architecture will give you full ZTNA-style resilience with real-time API responses and no node exposure.
