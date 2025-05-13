#!/usr/bin/env python3
import os
import time
import sys
import logging
import argparse
import schedule
import requests
from datetime import datetime

from utils import setup_logging, run_diagnostic_command

# Setup logging
logger = setup_logging()

class ProbeAgent:
    def __init__(self):
        # Load configuration from environment variables
        self.backend_url = os.getenv("BACKEND_URL", "http://backend:8000")
        self.api_key = os.getenv("API_KEY", "")
        self.interval = int(os.getenv("INTERVAL_SECONDS", "300"))  # Default: 5 minutes
        self.targets = os.getenv("TARGETS", "example.com,google.com").split(",")
        self.tools = os.getenv("TOOLS", "ping").split(",")
        
        if not self.api_key:
            logger.warning("No API key provided. Some operations may fail.")
        
        logger.info(f"Probe agent initialized with backend URL: {self.backend_url}")
        logger.info(f"Running diagnostics every {self.interval} seconds")
        logger.info(f"Targets: {', '.join(self.targets)}")
        logger.info(f"Tools: {', '.join(self.tools)}")
    
    def check_backend_health(self):
        """Check if the backend API is reachable"""
        try:
            response = requests.get(f"{self.backend_url}/", timeout=5)
            return response.status_code == 200
        except requests.RequestException as e:
            logger.error(f"Backend health check failed: {e}")
            return False
    
    def run_diagnostic(self, tool, target):
        """Run a diagnostic through the backend API"""
        logger.info(f"Running {tool} diagnostic on {target}")
        
        # Construct API URL based on the tool
        url = f"{self.backend_url}/api/diagnostics/{tool}"
        
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        params = {"target": target}
        
        # Add tool-specific parameters
        if tool == "ping":
            params["count"] = 4
        elif tool == "traceroute":
            params["max_hops"] = 30
        
        try:
            # Try API call first
            response = requests.get(url, params=params, headers=headers, timeout=30)
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Diagnostic result: {tool} on {target} - {result['status']}")
                return True
            else:
                logger.warning(f"API diagnostic failed: {response.status_code} - {response.text}")
                # If API fails, fall back to local command
                return self._run_local_diagnostic(tool, target)
        
        except requests.RequestException as e:
            logger.error(f"API request error: {e}")
            # Fall back to local command on API failure
            return self._run_local_diagnostic(tool, target)
    
    def _run_local_diagnostic(self, tool, target):
        """Run diagnostic locally as a fallback"""
        logger.info(f"Falling back to local {tool} command for {target}")
        success, output = run_diagnostic_command(tool, target)
        logger.info(f"Local {tool} result: {'success' if success else 'failure'}")
        if not success:
            logger.error(output)
        return success
    
    def run_all_diagnostics(self):
        """Run all configured diagnostics on all targets"""
        successful = 0
        failed = 0
        
        logger.info(f"Starting diagnostic run at {datetime.now().isoformat()}")
        
        # Check backend health first
        if not self.check_backend_health():
            logger.warning("Backend is not reachable, will use local commands only")
        
        for tool in self.tools:
            for target in self.targets:
                try:
                    result = self.run_diagnostic(tool, target)
                    if result:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Unexpected error running {tool} on {target}: {e}")
                    failed += 1
        
        logger.info(f"Diagnostic run complete: {successful} successful, {failed} failed")
    
    def start(self):
        """Start the probe agent scheduler"""
        logger.info("Starting probe agent")
        
        # Run once at startup
        self.run_all_diagnostics()
        
        # Schedule regular runs
        schedule.every(self.interval).seconds.do(self.run_all_diagnostics)
        
        logger.info(f"Scheduler started, running every {self.interval} seconds")
        
        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(1)

def main():
    parser = argparse.ArgumentParser(description="ProbeOps Diagnostic Agent")
    parser.add_argument("--run-once", action="store_true", help="Run diagnostics once and exit")
    args = parser.parse_args()
    
    agent = ProbeAgent()
    
    if args.run_once:
        agent.run_all_diagnostics()
    else:
        agent.start()

if __name__ == "__main__":
    main()
