#!/usr/bin/env python3

"""
ProbeOps Probe Node Launcher with Token Support
===============================================

This script configures and launches a probe node that connects to the ProbeOps
backend using WebSocket for Zero Trust Network Access (ZTNA).

Usage:
    python run_probe_node_token.py --token "TOKEN"
    OR
    python run_probe_node_token.py --backend https://probeops.com --uuid NODE_UUID --key API_KEY

Environment variables can also be used:
    PROBEOPS_TOKEN - JWT token containing all configuration
    PROBEOPS_BACKEND_URL - Backend URL (default: http://localhost:8000)
    PROBEOPS_NODE_UUID - Node UUID (required unless using token)
    PROBEOPS_API_KEY - API Key (required unless using token)
"""

import os
import sys
import jwt
import json
import logging
import asyncio
import argparse
import websockets
import requests
from datetime import datetime
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('probe_node.log')
    ]
)
logger = logging.getLogger('probeops_node')

# JWT secret for token verification
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")

def parse_token(token):
    """Parse and validate the configuration token."""
    try:
        # Decode the token
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        # Extract the environment variables from the payload
        env_vars = {}
        for key, value in payload.items():
            if key not in ['iat', 'exp']:  # Skip JWT metadata
                env_vars[key] = value
        
        return env_vars
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired. Please generate a new token.")
        sys.exit(1)
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        sys.exit(1)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='ProbeOps Node with Token Support')
    
    # Token-based configuration
    parser.add_argument('--token', help='JWT token containing all configuration')
    
    # Traditional configuration options
    parser.add_argument('--backend', help='Backend URL')
    parser.add_argument('--uuid', help='Node UUID')
    parser.add_argument('--key', help='API Key')
    
    return parser.parse_args()

class ProbeNode:
    def __init__(self, config):
        """Initialize the probe node with configuration."""
        self.backend_url = config.get('BACKEND_URL', os.environ.get('PROBEOPS_BACKEND_URL', 'http://localhost:8000'))
        self.node_uuid = config.get('NODE_UUID', os.environ.get('PROBEOPS_NODE_UUID'))
        self.api_key = config.get('API_KEY', os.environ.get('PROBEOPS_API_KEY'))
        self.log_level = config.get('LOG_LEVEL', os.environ.get('LOG_LEVEL', 'INFO')).upper()
        
        # Set log level based on configuration
        logger.setLevel(getattr(logging, self.log_level))
        
        # Validate essential configuration
        if not self.node_uuid or not self.api_key:
            logger.error("Node UUID and API Key are required.")
            sys.exit(1)
        
        # Calculate WebSocket URL
        if self.backend_url.startswith('https://'):
            self.ws_url = f"wss://{self.backend_url.split('://')[1]}/ws/node/{self.node_uuid}"
        else:
            self.ws_url = f"ws://{self.backend_url.split('://')[1]}/ws/node/{self.node_uuid}"
        
        logger.info(f"Probe Node initialized with UUID: {self.node_uuid}")
        logger.info(f"Backend URL: {self.backend_url}")
        logger.info(f"WebSocket URL: {self.ws_url}")
    
    async def register_node(self):
        """Register the node with the backend if not already registered."""
        registration_url = urljoin(self.backend_url, '/api/nodes/register')
        
        try:
            headers = {'Authorization': f'Bearer {self.api_key}'}
            data = {
                'node_uuid': self.node_uuid,
                'name': f"Node-{self.node_uuid[:8]}",
                'metadata': {
                    'hostname': os.uname().nodename,
                    'ip': requests.get('https://api.ipify.org').text,
                    'os': f"{os.uname().sysname} {os.uname().release}",
                    'registered_at': datetime.now().isoformat()
                }
            }
            
            response = requests.post(
                registration_url,
                headers=headers,
                json=data
            )
            
            if response.status_code == 200:
                logger.info("Node successfully registered with backend")
                return True
            elif response.status_code == 409:
                logger.info("Node already registered")
                return True
            else:
                logger.error(f"Failed to register node: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error registering node: {str(e)}")
            return False
    
    async def connect_websocket(self):
        """Establish and maintain WebSocket connection to the backend."""
        headers = {'Authorization': f'Bearer {self.api_key}'}
        
        while True:
            try:
                logger.info(f"Connecting to WebSocket at {self.ws_url}")
                async with websockets.connect(self.ws_url, extra_headers=headers) as websocket:
                    logger.info("WebSocket connection established")
                    
                    # Send initial heartbeat
                    await websocket.send(json.dumps({
                        'type': 'heartbeat',
                        'node_uuid': self.node_uuid,
                        'timestamp': datetime.now().isoformat()
                    }))
                    
                    # Listen for commands
                    while True:
                        try:
                            message = await websocket.recv()
                            await self.handle_message(websocket, message)
                        except websockets.exceptions.ConnectionClosed:
                            logger.warning("WebSocket connection closed, reconnecting...")
                            break
            
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
            
            # Wait before reconnecting
            logger.info("Waiting 5 seconds before reconnecting...")
            await asyncio.sleep(5)
    
    async def handle_message(self, websocket, message):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            logger.debug(f"Received message of type: {msg_type}")
            
            if msg_type == 'ping':
                # Respond to ping with pong
                await websocket.send(json.dumps({
                    'type': 'pong',
                    'node_uuid': self.node_uuid,
                    'timestamp': datetime.now().isoformat()
                }))
            
            elif msg_type == 'run_diagnostic':
                # Handle diagnostic command
                tool = data.get('tool')
                target = data.get('target')
                task_id = data.get('task_id')
                
                logger.info(f"Running diagnostic: {tool} on {target} (Task ID: {task_id})")
                
                # TODO: Implement actual diagnostic tools
                # For now, send a mock result
                await websocket.send(json.dumps({
                    'type': 'diagnostic_result',
                    'node_uuid': self.node_uuid,
                    'task_id': task_id,
                    'tool': tool,
                    'target': target,
                    'status': 'success',
                    'result': f"Mock {tool} result for {target}",
                    'timestamp': datetime.now().isoformat()
                }))
            
            else:
                logger.warning(f"Unknown message type: {msg_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message: {message}")
        
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
    
    async def start(self):
        """Start the probe node."""
        logger.info("Starting ProbeOps Probe Node")
        
        # Register the node with the backend
        if await self.register_node():
            # Connect to WebSocket and handle messages
            await self.connect_websocket()
        else:
            logger.error("Failed to register node, exiting.")
            sys.exit(1)

async def main():
    """Main entry point for the launcher."""
    args = parse_args()
    
    # Determine configuration source
    if args.token or os.environ.get('PROBEOPS_TOKEN'):
        # Use token-based configuration
        token = args.token or os.environ.get('PROBEOPS_TOKEN')
        logger.info("Using token-based configuration")
        config = parse_token(token)
    else:
        # Use traditional configuration
        config = {
            'BACKEND_URL': args.backend,
            'NODE_UUID': args.uuid,
            'API_KEY': args.key
        }
    
    # Initialize and start the probe node
    probe_node = ProbeNode(config)
    await probe_node.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Probe node shutdown requested")
    except Exception as e:
        logger.critical(f"Unhandled exception: {str(e)}")
        sys.exit(1)