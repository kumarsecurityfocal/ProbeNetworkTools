#!/usr/bin/env python3
"""
WebSocket client for ProbeOps probe nodes.
Implements secure connection to the backend with ZTNA principles:
- Outbound-only connections
- Persistent WebSocket connection
- Authentication with API key
- Automatic reconnection with exponential backoff
- Diagnostic command processing
"""

import asyncio
import json
import logging
import os
import platform
import random
import signal
import socket
import ssl
import sys
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable, Union

import websockets
from websockets.client import WebSocketClientProtocol
from websockets.exceptions import (
    ConnectionClosed, 
    InvalidStatusCode, 
    InvalidHandshake,
    WebSocketException
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("probe-ws-client")

# Default configuration
DEFAULT_CONFIG = {
    "ws_reconnect_min_delay": 1.0,  # Initial reconnection delay in seconds
    "ws_reconnect_max_delay": 30.0,  # Maximum reconnection delay in seconds
    "ws_reconnect_factor": 1.5,  # Exponential backoff factor
    "ws_reconnect_jitter": 0.1,  # Random jitter factor to avoid thundering herd
    "ws_ping_interval": 30,  # Seconds between ping messages
    "ws_ping_timeout": 10,  # Seconds to wait for pong response
    "connection_keepalive": True,  # Whether to keep connection alive indefinitely
    "heartbeat_interval": 15,  # Seconds between heartbeat messages
}

class ProbeNodeWSClient:
    """
    WebSocket client for probe nodes implementing Zero Trust Network Access (ZTNA) principles.
    The client establishes an outbound WebSocket connection to the ProbeOps backend
    and maintains a persistent connection for receiving diagnostic commands.
    """
    
    def __init__(
        self,
        backend_url: str,
        node_uuid: str,
        api_key: str,
        config: Optional[Dict[str, Any]] = None,
        tools_handler: Optional[Callable] = None,
        ssl_context: Optional[ssl.SSLContext] = None,
    ):
        """
        Initialize the WebSocket client.
        
        Args:
            backend_url: Base URL of the ProbeOps backend (e.g. "https://probeops.com")
            node_uuid: UUID of this probe node
            api_key: API key for authentication
            config: Optional configuration overrides
            tools_handler: Optional callback for handling diagnostic tool execution
            ssl_context: Optional SSL context for secure connections
        """
        # Basic node information
        self.node_uuid = node_uuid
        self.api_key = api_key
        
        # Create WebSocket URI from backend URL
        # Handle both HTTP/HTTPS URLs
        if backend_url.startswith("http://"):
            self.ws_uri = f"ws://{backend_url[7:]}/ws/node"
        elif backend_url.startswith("https://"):
            self.ws_uri = f"wss://{backend_url[8:]}/ws/node"
        else:
            # Assume HTTPS by default
            self.ws_uri = f"wss://{backend_url}/ws/node"
            
        # Set up configuration with defaults and overrides
        self.config = DEFAULT_CONFIG.copy()
        if config:
            self.config.update(config)
            
        # Connection state
        self.websocket: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self.last_reconnect_delay = self.config["ws_reconnect_min_delay"]
        self.connection_id: Optional[str] = None
        self.reconnect_count = 0
        self.last_ping_time = 0
        self.last_heartbeat_time = 0
        self.connection_start_time = 0
        self.should_reconnect = True
        
        # Callbacks
        self.tools_handler = tools_handler
        
        # SSL context
        self.ssl_context = ssl_context
        
        # Node state
        self.current_load = 0.0  # 0.0 to 1.0
        self.error_count = 0
        self.diagnostics_executed = 0
        self.pending_jobs: Dict[str, Dict] = {}  # request_id -> job info
        
        # Locks
        self._connection_lock = asyncio.Lock()
        
        # Internal events
        self._shutdown_event = asyncio.Event()
        self._reconnect_event = asyncio.Event()
        
        # System information
        self.system_info = self._get_system_info()
        
    async def connect(self) -> bool:
        """Establish WebSocket connection with authentication."""
        if self.connected and self.websocket:
            # Already connected
            return True
            
        async with self._connection_lock:
            try:
                # Close existing connection if any
                if self.websocket:
                    await self.websocket.close()
                    self.websocket = None
                    self.connected = False
                
                # Set up extra connection parameters
                extra_options = {}
                if self.ssl_context:
                    extra_options["ssl"] = self.ssl_context
                
                # Establish WebSocket connection    
                self.websocket = await websockets.connect(
                    self.ws_uri,
                    ping_interval=self.config["ws_ping_interval"],
                    ping_timeout=self.config["ws_ping_timeout"],
                    **extra_options
                )
                
                # Send authentication message
                auth_message = {
                    "node_uuid": self.node_uuid,
                    "api_key": self.api_key,
                    "version": self.system_info.get("version", "unknown"),
                    "hostname": self.system_info.get("hostname", "unknown")
                }
                
                await self.websocket.send(json.dumps(auth_message))
                
                # Wait for authentication response
                response_raw = await self.websocket.recv()
                response = json.loads(response_raw)
                
                if response.get("status") != "connected":
                    error_msg = response.get("message", "Authentication failed")
                    logger.error(f"Connection failed: {error_msg}")
                    await self.websocket.close()
                    self.websocket = None
                    return False
                
                # Successfully connected
                self.connected = True
                self.connection_id = response.get("connection_id")
                self.connection_start_time = time.time()
                self.last_ping_time = time.time()
                self.last_heartbeat_time = time.time()
                
                # Update reconnection parameters if provided
                reconnect_info = response.get("reconnect", {})
                if reconnect_info:
                    self.config["ws_reconnect_min_delay"] = reconnect_info.get(
                        "min_delay", self.config["ws_reconnect_min_delay"]
                    ) / 1000.0  # Convert from ms to seconds
                    
                    self.config["ws_reconnect_max_delay"] = reconnect_info.get(
                        "max_delay", self.config["ws_reconnect_max_delay"]
                    ) / 1000.0  # Convert from ms to seconds
                    
                    self.config["ws_reconnect_jitter"] = reconnect_info.get(
                        "jitter_factor", self.config["ws_reconnect_jitter"]
                    )
                
                logger.info(
                    f"Connected to {self.ws_uri} (Connection ID: {self.connection_id})"
                )
                
                # Reset reconnection delay on successful connection
                self.last_reconnect_delay = self.config["ws_reconnect_min_delay"]
                self.reconnect_count += 1
                
                return True
                
            except (ConnectionRefusedError, InvalidStatusCode, InvalidHandshake) as e:
                logger.error(f"Failed to connect: {e}")
                self.connected = False
                self.websocket = None
                return False
                
            except Exception as e:
                logger.error(f"Unexpected error during connection: {e}")
                self.connected = False
                self.websocket = None
                return False
    
    async def disconnect(self) -> None:
        """Gracefully disconnect from WebSocket server."""
        self.should_reconnect = False
        self._shutdown_event.set()
        
        if self.websocket:
            try:
                await self.websocket.close()
                logger.info("Disconnected from WebSocket server")
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")
                
        self.connected = False
        self.websocket = None
    
    async def reconnect(self) -> None:
        """
        Reconnect to the WebSocket server with exponential backoff.
        """
        if not self.should_reconnect:
            return
            
        # Calculate backoff delay with jitter
        delay = min(
            self.config["ws_reconnect_max_delay"],
            self.last_reconnect_delay * self.config["ws_reconnect_factor"]
        )
        
        # Add jitter to avoid reconnection storms
        jitter = self.config["ws_reconnect_jitter"]
        delay = delay * (1 + random.uniform(-jitter, jitter))
        
        logger.info(f"Reconnecting in {delay:.1f} seconds...")
        
        # Update for next reconnection attempt
        self.last_reconnect_delay = delay
        
        # Wait before reconnecting
        try:
            # Allow early reconnection if triggered externally
            await asyncio.wait_for(
                self._reconnect_event.wait(),
                timeout=delay
            )
        except asyncio.TimeoutError:
            pass
            
        # Clear reconnect event if it was set
        self._reconnect_event.clear()
        
        # Try to connect
        success = await self.connect()
        if not success and self.should_reconnect:
            # Schedule another reconnection attempt
            asyncio.create_task(self.reconnect())
    
    def trigger_reconnect(self) -> None:
        """Trigger an immediate reconnection attempt."""
        self._reconnect_event.set()
    
    async def send_heartbeat(self) -> None:
        """Send a heartbeat message to the server."""
        if not self.connected or not self.websocket:
            return
            
        try:
            uptime = int(time.time() - self.connection_start_time)
            
            # Update system metrics
            cpu_usage = self._get_cpu_usage()
            memory_usage = self._get_memory_usage()
            self.current_load = (cpu_usage + memory_usage) / 2 / 100.0  # 0.0 to 1.0
            
            heartbeat_msg = {
                "type": "heartbeat",
                "node_uuid": self.node_uuid,
                "uptime": uptime,
                "current_load": self.current_load,
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "error_count": self.error_count,
                "diagnostics_executed": self.diagnostics_executed,
                "pending_jobs": len(self.pending_jobs),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await self.websocket.send(json.dumps(heartbeat_msg))
            self.last_heartbeat_time = time.time()
            logger.debug(f"Sent heartbeat (uptime: {uptime}s, load: {self.current_load:.2f})")
            
        except Exception as e:
            logger.error(f"Error sending heartbeat: {e}")
    
    async def heartbeat_loop(self) -> None:
        """Background task to send periodic heartbeats."""
        while not self._shutdown_event.is_set():
            if self.connected and self.websocket:
                # Check if it's time to send a heartbeat
                time_since_last = time.time() - self.last_heartbeat_time
                if time_since_last >= self.config["heartbeat_interval"]:
                    await self.send_heartbeat()
            
            # Wait a short time to check again
            try:
                await asyncio.wait_for(
                    self._shutdown_event.wait(),
                    timeout=1.0
                )
            except asyncio.TimeoutError:
                pass
    
    async def handle_diagnostic_job(self, job_data: Dict[str, Any]) -> None:
        """
        Handle a diagnostic job request from the server.
        
        Args:
            job_data: Job data from the server
        """
        request_id = job_data.get("request_id")
        if not request_id:
            logger.error("Received job without request_id")
            return
            
        # Store job in pending jobs
        self.pending_jobs[request_id] = {
            "request_id": request_id,
            "tool": job_data.get("tool"),
            "target": job_data.get("target"),
            "parameters": job_data.get("parameters", {}),
            "priority": job_data.get("priority", 1),
            "timeout": job_data.get("timeout", 30),
            "received_at": time.time()
        }
        
        # Log job details
        logger.info(
            f"Received diagnostic job: {job_data.get('tool')} → {job_data.get('target')} "
            f"(request_id: {request_id}, priority: {job_data.get('priority', 1)})"
        )
        
        if self.tools_handler:
            # Execute job with handler callback
            try:
                # Run tool handler with job data
                result = await self.tools_handler(
                    job_data.get("tool"),
                    job_data.get("target"),
                    job_data.get("parameters", {}),
                    timeout=job_data.get("timeout", 30)
                )
                
                success = True
                self.diagnostics_executed += 1
                
            except Exception as e:
                # Handle execution errors
                result = {"error": str(e)}
                success = False
                self.error_count += 1
                logger.error(f"Error executing diagnostic job {request_id}: {e}")
        else:
            # No handler available
            result = {"error": "No diagnostic tools handler configured"}
            success = False
            logger.warning(f"Cannot execute job {request_id}: No tools handler configured")
        
        # Send result back to server
        if self.connected and self.websocket:
            try:
                response = {
                    "type": "diagnostic_response",
                    "request_id": request_id,
                    "result": result,
                    "success": success,
                    "execution_time": time.time() - self.pending_jobs[request_id]["received_at"],
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                await self.websocket.send(json.dumps(response))
                
                # Remove from pending jobs
                if request_id in self.pending_jobs:
                    del self.pending_jobs[request_id]
                    
            except Exception as e:
                logger.error(f"Error sending diagnostic result: {e}")
    
    async def listen_loop(self) -> None:
        """
        Main loop for listening to messages from the server.
        Handles reconnection on connection loss.
        """
        while not self._shutdown_event.is_set():
            if not self.connected:
                # Try to connect (or reconnect)
                success = await self.connect()
                if not success:
                    # Failed to connect, schedule reconnection
                    asyncio.create_task(self.reconnect())
                    
                    # Wait until reconnect_event is set or shutdown_event is set
                    done, pending = await asyncio.wait(
                        [
                            self._reconnect_event.wait(),
                            self._shutdown_event.wait()
                        ],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    # Cancel any pending tasks
                    for task in pending:
                        task.cancel()
                        
                    # Clear reconnect event if it was set
                    self._reconnect_event.clear()
                    
                    # Check if we should exit
                    if self._shutdown_event.is_set():
                        break
                        
                    # Continue to reconnection logic
                    continue
            
            # We should be connected now
            assert self.websocket is not None
            
            try:
                # Receive and process message
                message_raw = await self.websocket.recv()
                try:
                    message = json.loads(message_raw)
                except json.JSONDecodeError:
                    logger.error(f"Received invalid JSON: {message_raw}")
                    continue
                
                # Handle different message types
                message_type = message.get("type")
                
                if message_type == "heartbeat_ack":
                    # Heartbeat acknowledgment, no action needed
                    pass
                    
                elif message_type == "diagnostic_job":
                    # Process diagnostic job
                    await self.handle_diagnostic_job(message)
                    
                elif message_type == "result_received":
                    # Server acknowledged receipt of our diagnostic result
                    request_id = message.get("request_id")
                    if request_id and request_id in self.pending_jobs:
                        del self.pending_jobs[request_id]
                        
                elif message_type == "error":
                    # Handle error messages
                    logger.error(f"Received error from server: {message.get('message')}")
                    
                else:
                    # Unknown message type
                    logger.warning(f"Received unknown message type: {message_type}")
                
            except ConnectionClosed:
                logger.warning("WebSocket connection closed")
                self.connected = False
                self.websocket = None
                
                # Schedule reconnection
                if self.should_reconnect:
                    asyncio.create_task(self.reconnect())
                    
                # Wait for reconnection or shutdown
                done, pending = await asyncio.wait(
                    [
                        self._reconnect_event.wait(),
                        self._shutdown_event.wait()
                    ],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # Cancel pending tasks
                for task in pending:
                    task.cancel()
                    
                # Clear reconnect event if it was set
                self._reconnect_event.clear()
                
            except Exception as e:
                logger.error(f"Error in WebSocket client: {e}")
                self.error_count += 1
                
                # Brief delay to avoid tight loop on persistent errors
                await asyncio.sleep(1)
    
    async def run(self) -> None:
        """
        Run the WebSocket client, handling connections and messages.
        This is the main entry point for the client.
        """
        self.should_reconnect = True
        self._shutdown_event.clear()
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.heartbeat_loop())
        
        try:
            # Run the main listen loop
            await self.listen_loop()
        finally:
            # Clean up
            self._shutdown_event.set()
            await heartbeat_task
            
            # Ensure we're disconnected
            if self.connected and self.websocket:
                await self.websocket.close()
                self.connected = False
                self.websocket = None
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get basic system information for the probe node."""
        try:
            hostname = socket.gethostname()
            system = platform.system()
            release = platform.release()
            machine = platform.machine()
            python_version = sys.version
            
            try:
                with open("/etc/os-release") as f:
                    os_release = dict(
                        line.strip().replace('"', '').split("=", 1)
                        for line in f
                        if "=" in line
                    )
                os_name = os_release.get("PRETTY_NAME", system)
            except (FileNotFoundError, IOError):
                os_name = system
                
            # Try to get public IP
            try:
                # This is a simple way to get external IP - in production,
                # you might use a more reliable service or method
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    s.connect(("8.8.8.8", 80))
                    internal_ip = s.getsockname()[0]
            except Exception:
                internal_ip = "unknown"
                
            return {
                "hostname": hostname,
                "os": os_name,
                "system": system,
                "release": release,
                "machine": machine,
                "python_version": python_version,
                "internal_ip": internal_ip,
                "version": "1.0.0",  # Client software version
            }
            
        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return {
                "hostname": "unknown",
                "version": "1.0.0",
            }
    
    def _get_cpu_usage(self) -> float:
        """Get current CPU usage as a percentage (0-100)."""
        try:
            import psutil
            return psutil.cpu_percent(interval=0.1)
        except ImportError:
            return 0.0
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage as a percentage (0-100)."""
        try:
            import psutil
            return psutil.virtual_memory().percent
        except ImportError:
            return 0.0


async def execute_diagnostic_tool(
    tool: str, 
    target: str, 
    parameters: Dict[str, Any], 
    timeout: int = 30
) -> Dict[str, Any]:
    """
    Execute a diagnostic tool and return the result.
    This is a placeholder implementation that should be replaced with actual tool execution.
    
    Args:
        tool: The diagnostic tool to run (ping, traceroute, dns, etc.)
        target: The target hostname or IP address
        parameters: Additional parameters for the tool
        timeout: Maximum execution time in seconds
        
    Returns:
        A dictionary with the tool results
    """
    # In a real implementation, this would actually run the tools
    if tool == "ping":
        await asyncio.sleep(1)  # Simulate tool execution time
        return {
            "success": True,
            "packets_sent": 4,
            "packets_received": 4, 
            "packet_loss": 0,
            "min_ms": 10.2,
            "avg_ms": 15.7,
            "max_ms": 24.1
        }
        
    elif tool == "traceroute":
        await asyncio.sleep(2)  # Simulate tool execution time
        return {
            "success": True,
            "hops": [
                {"hop": 1, "host": "192.168.1.1", "ms": 1.2},
                {"hop": 2, "host": "10.0.0.1", "ms": 5.7},
                {"hop": 3, "host": target, "ms": 12.3}
            ]
        }
        
    elif tool == "dns":
        await asyncio.sleep(0.5)  # Simulate tool execution time
        return {
            "success": True,
            "records": [
                {"type": "A", "value": "192.168.1.10", "ttl": 300}
            ]
        }
        
    else:
        # Unsupported tool
        raise ValueError(f"Unsupported diagnostic tool: {tool}")


async def main():
    """Main entry point for the client when run from command line."""
    # Get configuration from environment or command line
    backend_url = os.environ.get("PROBEOPS_BACKEND_URL", "http://localhost:8000")
    node_uuid = os.environ.get("PROBEOPS_NODE_UUID", "")
    api_key = os.environ.get("PROBEOPS_API_KEY", "")
    
    # Check required parameters
    if not node_uuid or not api_key:
        logger.error("Missing required environment variables: PROBEOPS_NODE_UUID, PROBEOPS_API_KEY")
        sys.exit(1)
    
    # Create client
    client = ProbeNodeWSClient(
        backend_url=backend_url,
        node_uuid=node_uuid,
        api_key=api_key,
        tools_handler=execute_diagnostic_tool
    )
    
    # Set up signal handling for graceful shutdown
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(
            sig, 
            lambda: asyncio.create_task(client.disconnect())
        )
    
    # Run client
    logger.info(f"Starting WebSocket client for node {node_uuid}")
    logger.info(f"Connecting to {backend_url}")
    
    await client.run()
    
    logger.info("WebSocket client stopped")


if __name__ == "__main__":
    # Run main coroutine
    asyncio.run(main())