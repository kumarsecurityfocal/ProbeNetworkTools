#!/usr/bin/env python3
"""
ProbeOps Probe Node Launcher
============================

This script configures and launches a probe node that connects to the ProbeOps
backend using WebSocket for Zero Trust Network Access (ZTNA).

Usage:
    python run_probe_node.py --backend https://probeops.com --uuid NODE_UUID --key API_KEY

Environment variables can be used instead of command line arguments:
    PROBEOPS_BACKEND_URL - Backend URL (default: http://localhost:8000)
    PROBEOPS_NODE_UUID - Node UUID (required)
    PROBEOPS_API_KEY - API Key (required)
"""

import argparse
import asyncio
import logging
import os
import sys
from typing import Dict, Any, Optional

try:
    import websockets
except ImportError:
    print("Error: websockets package is required")
    print("Install it with: pip install websockets")
    sys.exit(1)

try:
    import psutil
except ImportError:
    print("Warning: psutil package is not installed")
    print("System metrics will not be available")
    print("Install it with: pip install psutil")

# Import our WebSocket client
from ws_client import ProbeNodeWSClient, execute_diagnostic_tool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("probe-launcher")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="ProbeOps Probe Node Launcher")
    
    parser.add_argument(
        "--backend", 
        help="Backend URL (default: http://localhost:8000)",
        default=os.environ.get("PROBEOPS_BACKEND_URL", "http://localhost:8000")
    )
    
    parser.add_argument(
        "--uuid", 
        help="Node UUID (required)",
        default=os.environ.get("PROBEOPS_NODE_UUID", "")
    )
    
    parser.add_argument(
        "--key", 
        help="API Key (required)",
        default=os.environ.get("PROBEOPS_API_KEY", "")
    )
    
    parser.add_argument(
        "--heartbeat", 
        help="Heartbeat interval in seconds (default: 15)",
        type=int,
        default=int(os.environ.get("PROBEOPS_HEARTBEAT_INTERVAL", "15"))
    )
    
    parser.add_argument(
        "--verbose", 
        help="Enable verbose logging",
        action="store_true"
    )
    
    return parser.parse_args()


async def main():
    """Main entry point for the launcher."""
    args = parse_args()
    
    # Set up logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.getLogger().setLevel(log_level)
    
    # Validate required parameters
    if not args.uuid:
        logger.error("Node UUID is required")
        sys.exit(1)
        
    if not args.key:
        logger.error("API Key is required")
        sys.exit(1)
    
    # Configuration
    config = {
        "heartbeat_interval": args.heartbeat,
        "connection_keepalive": True,
    }
    
    # Create client
    client = ProbeNodeWSClient(
        backend_url=args.backend,
        node_uuid=args.uuid,
        api_key=args.key,
        config=config,
        tools_handler=execute_diagnostic_tool
    )
    
    print(f"Starting ProbeOps probe node (UUID: {args.uuid})")
    print(f"Connecting to backend: {args.backend}")
    print(f"Press Ctrl+C to stop")
    
    # Run the client
    await client.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProbe node stopped by user")
        sys.exit(0)