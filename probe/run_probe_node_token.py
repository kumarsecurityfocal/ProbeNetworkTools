#!/usr/bin/env python3
"""
ProbeOps Probe Node with Token-Based Configuration
==================================================

This script runs a probe node that connects to the ProbeOps backend using
token-based configuration. Instead of setting multiple environment variables,
you only need to provide a single token that contains all necessary configuration.

Usage:
    python run_probe_node_token.py --token "YOUR_TOKEN_HERE"

The token will be decoded to extract all required configuration parameters.
"""

import argparse
import os
import sys
import json
import logging
import time
import asyncio
import jwt
import requests
from datetime import datetime

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('probe-node')

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='ProbeOps Probe Node with Token Configuration')
    parser.add_argument('--token', help='JWT token containing all configuration')
    parser.add_argument('--backend', help='Backend URL (only needed if not using token)')
    parser.add_argument('--uuid', help='Node UUID (only needed if not using token)')
    parser.add_argument('--key', help='API Key (only needed if not using token)')
    
    return parser.parse_args()

def decode_token(token):
    """
    Decode the JWT token to extract configuration.
    
    The token is expected to contain:
    - NODE_UUID: The unique identifier for this probe node
    - API_KEY: The API key for authentication
    - BACKEND_URL: The URL of the backend API
    - Additional optional configuration
    """
    try:
        # Decode the token without verification (the server will verify it)
        payload = jwt.decode(token, options={"verify_signature": False})
        
        logger.info(f"Token successfully decoded, expires: {payload.get('exp', 'never')}")
        
        # Extract required configuration
        config = {
            'node_uuid': payload.get('NODE_UUID'),
            'api_key': payload.get('API_KEY'),
            'backend_url': payload.get('BACKEND_URL'),
            'node_name': payload.get('NODE_NAME', f"Node-{payload.get('NODE_UUID', 'unknown')[:8]}"),
            'log_level': payload.get('LOG_LEVEL', 'INFO').upper(),
            'heartbeat_interval': int(payload.get('HEARTBEAT_INTERVAL', 15)),
        }
        
        # Validate required fields
        if not config['node_uuid']:
            raise ValueError("Token is missing NODE_UUID")
        if not config['api_key']:
            raise ValueError("Token is missing API_KEY")
        if not config['backend_url']:
            raise ValueError("Token is missing BACKEND_URL")
            
        # Set up log level from token
        logging.getLogger().setLevel(getattr(logging, config['log_level']))
            
        return config
        
    except jwt.PyJWTError as e:
        logger.error(f"Failed to decode token: {e}")
        raise ValueError(f"Invalid token format: {e}")

class ProbeNode:
    """Probe node that connects to the ProbeOps backend using WebSocket."""
    
    def __init__(self, config):
        """Initialize the probe node with configuration."""
        self.node_uuid = config['node_uuid']
        self.api_key = config['api_key']
        self.backend_url = config['backend_url'].rstrip('/')
        self.node_name = config['node_name']
        self.heartbeat_interval = config['heartbeat_interval']
        
        # Authorization header
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        logger.info(f"Probe node initialized for {self.node_name} ({self.node_uuid})")
        logger.info(f"Backend URL: {self.backend_url}")

    async def register_node(self):
        """Register the node with the backend if not already registered."""
        try:
            logger.info(f"Registering node {self.node_uuid} with backend...")
            
            register_url = f"{self.backend_url}/api/nodes/register"
            response = requests.post(
                register_url,
                headers=self.headers,
                json={
                    'node_uuid': self.node_uuid,
                    'name': self.node_name,
                    'metadata': {
                        'started_at': datetime.now().isoformat(),
                        'version': '1.0.0',
                        'platform': sys.platform
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Node {self.node_uuid} registered successfully")
                return True
            else:
                logger.error(f"Failed to register node: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error registering node: {e}")
            return False

    async def connect_websocket(self):
        """Establish and maintain WebSocket connection to the backend."""
        import websockets
        
        ws_url = f"{self.backend_url.replace('http://', 'ws://').replace('https://', 'wss://')}/api/ws/node/{self.node_uuid}"
        
        while True:
            try:
                logger.info(f"Connecting to WebSocket: {ws_url}")
                async with websockets.connect(
                    ws_url, 
                    extra_headers={'Authorization': f'Bearer {self.api_key}'}
                ) as websocket:
                    logger.info("WebSocket connection established")
                    
                    # Send initial hello message
                    await websocket.send(json.dumps({
                        'type': 'hello',
                        'node_uuid': self.node_uuid,
                        'timestamp': datetime.now().isoformat()
                    }))
                    
                    # Main connection loop
                    while True:
                        try:
                            message = await websocket.recv()
                            await self.handle_message(websocket, message)
                        except websockets.exceptions.ConnectionClosed:
                            logger.warning("WebSocket connection closed, reconnecting...")
                            break
                            
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                logger.info("Reconnecting in 5 seconds...")
                await asyncio.sleep(5)
    
    async def handle_message(self, websocket, message):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            logger.debug(f"Received message: {data}")
            
            if data.get('type') == 'ping':
                # Respond to ping with pong
                await websocket.send(json.dumps({
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat()
                }))
                
            elif data.get('type') == 'diagnostic_request':
                # Handle diagnostic request
                logger.info(f"Received diagnostic request: {data.get('tool')} for {data.get('target')}")
                
                # TODO: Implement diagnostic tools
                result = {
                    'success': True,
                    'message': f"Diagnostic {data.get('tool')} completed for {data.get('target')}",
                    'data': {
                        'timestamp': datetime.now().isoformat(),
                        'result': 'Sample diagnostic result'
                    }
                }
                
                # Send back result
                await websocket.send(json.dumps({
                    'type': 'diagnostic_response',
                    'request_id': data.get('request_id'),
                    'result': result
                }))
                
        except json.JSONDecodeError:
            logger.error(f"Failed to parse message: {message}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def start(self):
        """Start the probe node."""
        # First register the node
        if await self.register_node():
            # Then connect to WebSocket
            await self.connect_websocket()
        else:
            logger.error("Failed to register node, cannot continue")
            sys.exit(1)

async def main():
    """Main entry point for the probe node."""
    args = parse_args()
    
    if args.token:
        # If token is provided, use it for configuration
        logger.info("Token provided, decoding configuration...")
        config = decode_token(args.token)
    else:
        # Otherwise, use individual parameters
        logger.info("Using individual configuration parameters...")
        
        # Check for required parameters
        if not args.uuid or not args.key or not args.backend:
            logger.error("Missing required parameters. Either provide --token or all of: --uuid, --key, --backend")
            sys.exit(1)
            
        config = {
            'node_uuid': args.uuid,
            'api_key': args.key,
            'backend_url': args.backend,
            'node_name': f"Node-{args.uuid[:8]}",
            'log_level': os.environ.get('LOG_LEVEL', 'INFO').upper()
        }
    
    # Create and start probe node
    probe = ProbeNode(config)
    await probe.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Probe node stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)