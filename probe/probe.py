#!/usr/bin/env python3
"""
ProbeOps Probe Agent
====================

This script implements a standalone network probe agent that runs diagnostics
on configured targets and reports results to the ProbeOps backend.

It supports both periodic scheduled diagnostics and on-demand diagnostics
through the WebSocket connection to the backend.
"""

import argparse
import asyncio
import json
import logging
import os
import random
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Import our utilities
from utils import setup_logging, run_diagnostic_command

# Configure logging
setup_logging()
logger = logging.getLogger("probe-agent")


class ProbeAgent:
    def __init__(self):
        """Initialize the probe agent with configuration"""
        # Configuration defaults
        self.config = {
            "backend_url": os.environ.get("PROBEOPS_BACKEND_URL", "http://localhost:8000"),
            "api_key": os.environ.get("PROBEOPS_API_KEY", ""),
            "node_uuid": os.environ.get("PROBEOPS_NODE_UUID", ""),
            "targets": [
                {"host": "google.com", "tools": ["ping", "traceroute", "dns"]},
                {"host": "cloudflare.com", "tools": ["ping", "http"]},
            ],
            "interval": int(os.environ.get("PROBEOPS_INTERVAL", "300")),  # 5 minutes
            "enabled": True,
        }
        
        # State tracking
        self.last_run = {}
        self.failures = {}
        self.scheduler_task = None
        
    def check_backend_health(self):
        """Check if the backend API is reachable"""
        import requests
        
        try:
            url = f"{self.config['backend_url']}/health"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                return True
            else:
                logger.warning(f"Backend health check failed with status {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Backend health check failed: {str(e)}")
            return False
    
    def run_diagnostic(self, tool, target):
        """Run a diagnostic through the backend API"""
        # First try to run through API
        try:
            import requests
            
            url = f"{self.config['backend_url']}/api/diagnostics"
            headers = {
                "Authorization": f"Bearer {self.config['api_key']}",
                "Content-Type": "application/json"
            }
            data = {
                "tool": tool,
                "target": target,
                "node_uuid": self.config["node_uuid"],
                "parameters": {}
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(
                    f"API diagnostic failed with status {response.status_code}. "
                    f"Falling back to local diagnostic."
                )
                return self._run_local_diagnostic(tool, target)
                
        except Exception as e:
            logger.error(f"Error running API diagnostic: {str(e)}")
            logger.info(f"Falling back to local diagnostic")
            return self._run_local_diagnostic(tool, target)
    
    def _run_local_diagnostic(self, tool, target):
        """Run diagnostic locally as a fallback"""
        try:
            # Use our utility functions to run the diagnostic
            return run_diagnostic_command(tool, target)
            
        except Exception as e:
            logger.error(f"Error in local {tool} diagnostic to {target}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "tool": tool,
                "target": target,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def run_all_diagnostics(self):
        """Run all configured diagnostics on all targets"""
        results = []
        
        # Track current time
        now = datetime.utcnow()
        
        for target_config in self.config["targets"]:
            target = target_config["host"]
            tools = target_config["tools"]
            
            for tool in tools:
                # Track key for this diagnostic
                key = f"{tool}:{target}"
                
                # Check if we need to run this diagnostic
                last_run = self.last_run.get(key, datetime.min)
                time_since_last = (now - last_run).total_seconds()
                
                if time_since_last >= self.config["interval"]:
                    # Time to run this diagnostic
                    logger.info(f"Running {tool} on {target}")
                    result = self.run_diagnostic(tool, target)
                    
                    # Update tracking
                    self.last_run[key] = now
                    
                    # Track failures
                    if not result.get("success", False):
                        self.failures[key] = self.failures.get(key, 0) + 1
                    else:
                        # Reset failure count on success
                        self.failures[key] = 0
                        
                    # Add to results
                    results.append(result)
                    
                else:
                    # Not time yet
                    logger.debug(
                        f"Skipping {tool} on {target} - next run in "
                        f"{self.config['interval'] - time_since_last:.0f} seconds"
                    )
        
        return results
                    
    async def scheduler(self):
        """Background scheduler for periodic diagnostics"""
        while True:
            try:
                if self.config["enabled"]:
                    # Run all diagnostics
                    self.run_all_diagnostics()
                
                # Sleep until next interval with small random jitter
                jitter = random.uniform(0, 5)  # Up to 5 seconds of jitter
                await asyncio.sleep(self.config["interval"] + jitter)
                
            except Exception as e:
                logger.error(f"Error in scheduler: {str(e)}")
                # Brief delay on error
                await asyncio.sleep(10)
    
    def start(self):
        """Start the probe agent scheduler"""
        # Configure
        parser = argparse.ArgumentParser(description="ProbeOps Probe Agent")
        parser.add_argument("--backend", help="Backend URL", default=self.config["backend_url"])
        parser.add_argument("--key", help="API Key", default=self.config["api_key"])
        parser.add_argument("--uuid", help="Node UUID", default=self.config["node_uuid"])
        parser.add_argument("--interval", help="Run interval in seconds", type=int, default=self.config["interval"])
        parser.add_argument("--config", help="Path to JSON configuration file")
        args = parser.parse_args()
        
        # Load configuration from file if specified
        if args.config:
            try:
                with open(args.config, "r") as f:
                    self.config.update(json.load(f))
                logger.info(f"Loaded configuration from {args.config}")
            except Exception as e:
                logger.error(f"Error loading configuration: {str(e)}")
                sys.exit(1)
        
        # Override with command line arguments
        self.config["backend_url"] = args.backend
        self.config["api_key"] = args.key
        self.config["node_uuid"] = args.uuid
        self.config["interval"] = args.interval
        
        # Validate configuration
        if not self.config["api_key"]:
            logger.error("API Key is required")
            sys.exit(1)
            
        if not self.config["node_uuid"]:
            logger.error("Node UUID is required")
            sys.exit(1)
            
        # Check backend health
        if not self.check_backend_health():
            logger.warning("Backend is not reachable. Continuing with local diagnostics only.")
        
        # Start scheduler
        logger.info(f"Starting probe agent with {len(self.config['targets'])} targets")
        logger.info(f"Backend URL: {self.config['backend_url']}")
        logger.info(f"Interval: {self.config['interval']} seconds")
        
        try:
            # In a real implementation, we'd use asyncio here
            loop = asyncio.get_event_loop()
            self.scheduler_task = loop.create_task(self.scheduler())
            loop.run_forever()
            
        except KeyboardInterrupt:
            logger.info("Stopping probe agent")
            if self.scheduler_task:
                self.scheduler_task.cancel()
            sys.exit(0)
            
        except Exception as e:
            logger.error(f"Error starting probe agent: {str(e)}")
            sys.exit(1)


def main():
    """Main entry point"""
    agent = ProbeAgent()
    agent.start()


if __name__ == "__main__":
    main()