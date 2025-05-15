#!/usr/bin/env python3
"""
Utility functions for the ProbeOps probe node.
These implement basic diagnostic tools like ping, traceroute, and DNS lookups
using Python's standard library and minimal dependencies.
"""

import asyncio
import logging
import platform
import random
import socket
import struct
import subprocess
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("probe-utils")


def setup_logging():
    """Setup logging configuration"""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Create console handler
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Add formatter to console handler
    console.setFormatter(formatter)
    
    # Add console handler to root logger
    root_logger.addHandler(console)


def run_ping(target, count=4):
    """Run ping using TCP socket connection (HTTP port 80)"""
    results = {
        "success": False,
        "target": target,
        "packets_sent": count,
        "packets_received": 0,
        "packet_loss": 100.0,
        "min_ms": None,
        "avg_ms": None,
        "max_ms": None,
        "error": None,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Try to resolve the hostname to validate it
    try:
        socket.gethostbyname(target)
    except socket.gaierror as e:
        results["error"] = f"DNS resolution failed: {str(e)}"
        return results
    
    # Initialize statistics
    round_trip_times = []
    
    for i in range(count):
        try:
            start_time = time.time()
            
            # Create socket
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(3.0)  # 3 second timeout
                
                # Try to connect to port 80 (HTTP)
                try:
                    s.connect((target, 80))
                    
                    # Successful connection
                    end_time = time.time()
                    rtt = (end_time - start_time) * 1000  # Convert to ms
                    round_trip_times.append(rtt)
                    results["packets_received"] += 1
                    
                    # Close the connection
                    s.shutdown(socket.SHUT_RDWR)
                    
                except (socket.timeout, ConnectionRefusedError) as e:
                    # Connection failed
                    logger.debug(f"Ping to {target} failed: {str(e)}")
            
            # Wait a bit between pings
            if i < count - 1:
                time.sleep(0.5)
                
        except Exception as e:
            logger.error(f"Error in ping to {target}: {str(e)}")
            
    # Calculate statistics
    if round_trip_times:
        results["min_ms"] = min(round_trip_times)
        results["max_ms"] = max(round_trip_times)
        results["avg_ms"] = sum(round_trip_times) / len(round_trip_times)
        
    # Calculate packet loss
    if results["packets_sent"] > 0:
        results["packet_loss"] = (
            (results["packets_sent"] - results["packets_received"]) / 
            results["packets_sent"] * 100.0
        )
        
    # Set success flag
    results["success"] = results["packets_received"] > 0
    
    return results


def run_traceroute(target, max_hops=30):
    """Implement a TCP-based traceroute using increasing TTL values"""
    results = {
        "success": False,
        "target": target,
        "hops": [],
        "error": None,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Try to resolve the hostname to validate it
    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror as e:
        results["error"] = f"DNS resolution failed: {str(e)}"
        return results
    
    # Constants
    port = 80  # HTTP port
    timeout = 3.0  # Seconds
    
    # For each TTL from 1 to max_hops
    for ttl in range(1, max_hops + 1):
        # Create socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            
            # Set the TTL
            s.setsockopt(socket.SOL_IP, socket.IP_TTL, ttl)
            
            # Record start time
            start_time = time.time()
            
            try:
                # Try to connect to the target
                s.connect((target, port))
                
                # If we reach here, we've reached the destination
                end_time = time.time()
                rtt = (end_time - start_time) * 1000  # Convert to ms
                
                results["hops"].append({
                    "hop": ttl,
                    "host": ip,
                    "hostname": target,
                    "ms": rtt
                })
                
                # We've reached the destination - we're done
                s.close()
                results["success"] = True
                break
                
            except (socket.timeout, ConnectionRefusedError):
                # This happens when the TTL expires or the connection is refused
                # The ICMP response doesn't reach this socket, but we can
                # use getsockname() to get the local socket info
                s.close()
                
                # We don't know which router dropped the packet
                # But we can at least record the hop number
                results["hops"].append({
                    "hop": ttl,
                    "host": "*",
                    "hostname": None,
                    "ms": None
                })
                
            except socket.error as e:
                # If we get an ICMP response (usually message 3, code 0),
                # we can get the router's address from the error message
                # But this is highly system dependent and not reliable
                s.close()
                
                # Record the hop
                results["hops"].append({
                    "hop": ttl,
                    "host": str(e),
                    "hostname": None,
                    "ms": (time.time() - start_time) * 1000
                })
                
        except Exception as e:
            logger.error(f"Error in traceroute to {target} at hop {ttl}: {str(e)}")
            results["hops"].append({
                "hop": ttl,
                "host": "error",
                "hostname": None,
                "ms": None,
                "error": str(e)
            })
    
    # Set success flag
    results["success"] = len(results["hops"]) > 0
    
    return results


def run_dns_lookup(target, record_type="A"):
    """Perform a DNS lookup for the specified target and record type"""
    results = {
        "success": False,
        "target": target,
        "records": [],
        "error": None,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Use socket to resolve hostname
        if record_type == "A":
            addresses = socket.getaddrinfo(
                target, None, socket.AF_INET, socket.SOCK_STREAM
            )
            for addr in addresses:
                family, socktype, proto, canonname, sockaddr = addr
                ip, port = sockaddr
                results["records"].append({
                    "type": "A",
                    "value": ip,
                    "ttl": None  # socket doesn't provide TTL
                })
                
        elif record_type == "AAAA":
            addresses = socket.getaddrinfo(
                target, None, socket.AF_INET6, socket.SOCK_STREAM
            )
            for addr in addresses:
                family, socktype, proto, canonname, sockaddr = addr
                ip, port, flow, scope = sockaddr
                results["records"].append({
                    "type": "AAAA",
                    "value": ip,
                    "ttl": None  # socket doesn't provide TTL
                })
                
        elif record_type == "MX":
            # Simple socket doesn't support MX records
            # In a full implementation, you would use a DNS library like dnspython
            results["error"] = "MX record lookup requires dnspython package"
            return results
            
        else:
            results["error"] = f"Unsupported record type: {record_type}"
            return results
            
        # Set success flag
        results["success"] = len(results["records"]) > 0
        
    except socket.gaierror as e:
        results["error"] = f"DNS lookup failed: {str(e)}"
        
    except Exception as e:
        results["error"] = f"Error during DNS lookup: {str(e)}"
        
    return results


def run_http_check(url, timeout=10, verify_ssl=True):
    """Perform an HTTP check on the specified URL"""
    results = {
        "success": False,
        "url": url,
        "status_code": None,
        "response_time_ms": None,
        "error": None,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        # Import requests library if available
        try:
            import requests
            
            # Disable SSL warnings if not verifying certificates
            if not verify_ssl:
                import urllib3
                urllib3.disable_warnings()
                
            # Record start time
            start_time = time.time()
            
            # Make the request
            response = requests.get(
                url, 
                timeout=timeout,
                verify=verify_ssl
            )
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Record results
            results["status_code"] = response.status_code
            results["response_time_ms"] = response_time
            results["success"] = 200 <= response.status_code < 400
            
        except ImportError:
            # Use urllib as a fallback
            import urllib.request
            import urllib.error
            import ssl
            
            # Create context for SSL verification
            context = None
            if not verify_ssl:
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                
            # Record start time
            start_time = time.time()
            
            try:
                # Make the request
                response = urllib.request.urlopen(
                    url,
                    timeout=timeout,
                    context=context
                )
                
                # Calculate response time
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                # Record results
                results["status_code"] = response.getcode()
                results["response_time_ms"] = response_time
                results["success"] = 200 <= response.getcode() < 400
                
            except urllib.error.HTTPError as e:
                # Record HTTP error status
                results["status_code"] = e.code
                results["error"] = f"HTTP error: {e.reason}"
                results["response_time_ms"] = (time.time() - start_time) * 1000
                
            except urllib.error.URLError as e:
                # Record URL error
                results["error"] = f"URL error: {str(e.reason)}"
                
    except Exception as e:
        results["error"] = f"Error during HTTP check: {str(e)}"
        
    return results


def run_diagnostic_command(tool, target):
    """Run a diagnostic command locally"""
    if tool == "ping":
        return run_ping(target)
    elif tool == "traceroute":
        return run_traceroute(target)
    elif tool == "dns":
        return run_dns_lookup(target)
    elif tool == "http":
        return run_http_check(target)
    else:
        return {
            "success": False,
            "error": f"Unsupported diagnostic tool: {tool}"
        }