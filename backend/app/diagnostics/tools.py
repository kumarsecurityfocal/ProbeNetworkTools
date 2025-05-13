import subprocess
import socket
import dns.resolver
import ipaddress
from ping3 import ping
import time
from typing import Tuple, List, Dict, Any, Optional


def run_ping(target: str, count: int = 4) -> Tuple[bool, str]:
    """
    Run ping against a target using the ping3 library.
    
    Args:
        target: The hostname or IP address to ping
        count: Number of packets to send
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        socket.getaddrinfo(target, None)
        
        # Validate count
        if count < 1 or count > 100:
            count = 4  # Default to 4 for safety
            
        # Run ping using ping3 library
        result_output = f"PING {target}\n"
        success = False
        total_time = 0
        successful_pings = 0
        
        for i in range(count):
            response_time = ping(target, timeout=2)
            if response_time is not None and response_time is not False:
                success = True
                total_time += response_time
                successful_pings += 1
                result_output += f"64 bytes from {target}: icmp_seq={i+1} time={response_time*1000:.3f} ms\n"
            else:
                result_output += f"Request timeout for icmp_seq {i+1}\n"
            time.sleep(0.2)  # Small delay between pings
            
        # Add ping statistics
        packet_loss = ((count - successful_pings) / count) * 100
        result_output += f"\n--- {target} ping statistics ---\n"
        result_output += f"{count} packets transmitted, {successful_pings} received, {packet_loss:.1f}% packet loss\n"
        
        if successful_pings > 0:
            avg_time = total_time / successful_pings * 1000  # Convert to ms
            result_output += f"round-trip min/avg/max = {avg_time:.3f}/{avg_time:.3f}/{avg_time:.3f} ms\n"
            
        return success, result_output
    except socket.gaierror as e:
        return False, f"Error: Could not resolve hostname {target}: {str(e)}"
    except Exception as e:
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
    except Exception as e:
        return False, f"DNS Error: {str(e)}"
