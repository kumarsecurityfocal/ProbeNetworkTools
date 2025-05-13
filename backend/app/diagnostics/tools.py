import subprocess
import socket
import dns.resolver
import ipaddress
from typing import Tuple, List, Dict, Any, Optional


def run_ping(target: str, count: int = 4) -> Tuple[bool, str]:
    """
    Run ping command against a target.
    
    Args:
        target: The hostname or IP address to ping
        count: Number of packets to send
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        socket.getaddrinfo(target, None)
        
        # Run the ping command
        if count < 1 or count > 100:
            count = 4  # Default to 4 for safety
            
        result = subprocess.run(
            ["ping", "-c", str(count), target],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Check if the ping was successful (return code 0)
        success = result.returncode == 0
        return success, result.stdout
    except (socket.gaierror, subprocess.TimeoutExpired, subprocess.SubprocessError) as e:
        return False, f"Error: {str(e)}"


def run_traceroute(target: str, max_hops: int = 30) -> Tuple[bool, str]:
    """
    Run traceroute command against a target.
    
    Args:
        target: The hostname or IP address to trace
        max_hops: Maximum number of hops to probe
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        socket.getaddrinfo(target, None)
        
        # Run the traceroute command
        if max_hops < 1 or max_hops > 64:
            max_hops = 30  # Default to 30 for safety
            
        result = subprocess.run(
            ["traceroute", "-m", str(max_hops), target],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Traceroute can still give useful information even if it doesn't reach the target
        return True, result.stdout
    except (socket.gaierror, subprocess.TimeoutExpired, subprocess.SubprocessError) as e:
        return False, f"Error: {str(e)}"


def run_dns_lookup(target: str, record_type: str = "A") -> Tuple[bool, str]:
    """
    Run DNS lookup against a target.
    
    Args:
        target: The hostname to lookup
        record_type: DNS record type (A, AAAA, MX, etc.)
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate record type
        valid_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "PTR"]
        if record_type not in valid_types:
            return False, f"Invalid record type. Must be one of: {', '.join(valid_types)}"
        
        # Perform DNS lookup
        answers = dns.resolver.resolve(target, record_type)
        
        # Format the results
        result = f"DNS lookup for {target} ({record_type} records):\n\n"
        for rdata in answers:
            result += f"{rdata}\n"
            
        return True, result
    except dns.resolver.NXDOMAIN:
        return False, f"Error: Domain {target} does not exist"
    except dns.resolver.NoAnswer:
        return False, f"Error: No {record_type} records found for {target}"
    except dns.resolver.NoNameservers:
        return False, f"Error: No nameservers available for {target}"
    except dns.exception.DNSException as e:
        return False, f"DNS Error: {str(e)}"
