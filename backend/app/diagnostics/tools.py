import subprocess
import socket
import dns.resolver
import ipaddress
from ping3 import ping
import time
from typing import Tuple, List, Dict, Any, Optional


def run_ping(target: str, count: int = 4) -> Tuple[bool, str]:
    """
    Run ping against a target using a TCP socket approach.
    This is safer than using ICMP packets which require root privileges.
    
    Args:
        target: The hostname or IP address to ping
        count: Number of packets to send
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        addr_info = socket.getaddrinfo(target, None)
        ip_address = addr_info[0][4][0]  # Extract IP address
        
        # Validate count
        if count < 1 or count > 100:
            count = 4  # Default to 4 for safety
            
        # Use TCP socket connection to simulate ping
        # We'll try standard HTTP port (80) for the connection test
        result_output = f"PING {target} ({ip_address})\n"
        success = False
        total_time = 0
        successful_pings = 0
        
        for i in range(count):
            try:
                start_time = time.time()
                # Create a socket and attempt to connect
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)  # 2 second timeout
                
                # Connect to port 80 (HTTP)
                s.connect((ip_address, 80))
                s.close()
                
                # Calculate response time
                response_time = time.time() - start_time
                success = True
                total_time += response_time
                successful_pings += 1
                result_output += f"Connected to {target}: tcp_seq={i+1} time={response_time*1000:.3f} ms\n"
            except (socket.timeout, ConnectionRefusedError):
                result_output += f"Connection timeout for tcp_seq {i+1}\n"
            except Exception as e:
                result_output += f"Error in tcp_seq {i+1}: {str(e)}\n"
            
            time.sleep(0.2)  # Small delay between pings
            
        # Add ping statistics
        packet_loss = ((count - successful_pings) / count) * 100
        result_output += f"\n--- {target} TCP connection statistics ---\n"
        result_output += f"{count} attempts, {successful_pings} successful, {packet_loss:.1f}% failure rate\n"
        
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
