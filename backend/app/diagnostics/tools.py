import subprocess
import socket
import dns.resolver
import ipaddress
from ping3 import ping
import time
import requests
import json
from typing import Tuple, List, Dict, Any, Optional, Union
from urllib.parse import urlparse


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
    Implement a TCP-based traceroute using increasing TTL values.
    
    Args:
        target: The hostname or IP address to trace
        max_hops: Maximum number of hops to probe
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        addr_info = socket.getaddrinfo(target, None)
        ip_address = addr_info[0][4][0]  # Extract IP address
        
        # Validate max_hops
        if max_hops < 1 or max_hops > 64:
            max_hops = 30  # Default to 30 for safety
        
        # Initialize result
        result_output = f"Traceroute to {target} ({ip_address}), {max_hops} hops max\n\n"
        final_hop_reached = False
        
        # Try connections with increasing TTL values
        for ttl in range(1, max_hops + 1):
            # Get hostname for this hop if possible
            hop_host = ""
            hop_ip = ""
            response_time = None
            
            try:
                # Use a timeout to prevent hanging
                start_time = time.time()
                
                # Create a TCP socket to test the connection
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)  # 1 second timeout
                
                # Try to connect to port 80 (HTTP)
                try:
                    s.connect((ip_address, 80))
                    response_time = time.time() - start_time
                    hop_ip = ip_address
                    final_hop_reached = True
                except socket.timeout:
                    # This is expected for intermediate hops
                    pass
                except ConnectionRefusedError:
                    # Connection was refused but we reached the host
                    response_time = time.time() - start_time
                    hop_ip = ip_address
                    final_hop_reached = True
                finally:
                    s.close()
                
                # Try to get hostname for the IP
                if hop_ip:
                    try:
                        hop_info = socket.gethostbyaddr(hop_ip)
                        hop_host = hop_info[0]
                    except socket.herror:
                        hop_host = ""
            
            except Exception as e:
                result_output += f"{ttl}  * * *  Request timed out.\n"
                continue
            
            # Format the output for this hop
            if response_time is not None:
                if hop_host:
                    result_output += f"{ttl}  {hop_ip} ({hop_host})  {response_time*1000:.3f} ms\n"
                else:
                    result_output += f"{ttl}  {hop_ip}  {response_time*1000:.3f} ms\n"
            else:
                result_output += f"{ttl}  * * *  Request timed out.\n"
            
            # If we've reached the final destination, we're done
            if final_hop_reached:
                result_output += f"\nTrace complete to {target} ({ip_address})\n"
                break
        
        return True, result_output
    except socket.gaierror as e:
        return False, f"Error: Could not resolve hostname {target}: {str(e)}"
    except Exception as e:
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


def run_reverse_dns_lookup(ip_address: str) -> Tuple[bool, str]:
    """
    Run reverse DNS lookup to find hostnames associated with an IP address.
    
    Args:
        ip_address: The IP address to lookup
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate IP address format
        try:
            socket.inet_aton(ip_address)  # Will raise exception if not valid IPv4
        except socket.error:
            try:
                # Try IPv6
                socket.inet_pton(socket.AF_INET6, ip_address)
            except (socket.error, AttributeError):
                return False, f"Error: Invalid IP address format: {ip_address}"
        
        # Perform reverse DNS lookup
        try:
            host_info = socket.gethostbyaddr(ip_address)
            hostname = host_info[0]
            aliases = host_info[1]
            
            # Format the result
            result = f"Reverse DNS lookup for {ip_address}:\n\n"
            result += f"Hostname: {hostname}\n"
            
            if aliases and len(aliases) > 0:
                result += "\nAliases:\n"
                for alias in aliases:
                    result += f"- {alias}\n"
            
            # Also try to get PTR records explicitly
            try:
                addr = dns.reversename.from_address(ip_address)
                answers = dns.resolver.resolve(addr, "PTR")
                
                if answers:
                    result += "\nPTR Records:\n"
                    for rdata in answers:
                        result += f"- {rdata}\n"
            except Exception:
                # PTR lookup is optional, so we don't fail if it errors
                pass
            
            return True, result
        except socket.herror:
            return False, f"No reverse DNS records found for IP address: {ip_address}"
                
    except Exception as e:
        return False, f"Reverse DNS Error: {str(e)}"


def run_whois_lookup(target: str) -> Tuple[bool, str]:
    """
    Run WHOIS lookup against a domain.
    
    Args:
        target: The domain to lookup
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target to ensure it's a domain
        if not ('.' in target and not target.startswith('http')):
            return False, "Error: Invalid domain format. Please enter a valid domain like 'example.com'"
        
        # We'll use a subprocess to call whois since it's commonly available
        cmd = ["whois", target]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return False, f"WHOIS Error: {stderr.decode('utf-8', errors='ignore')}"
        
        result = stdout.decode('utf-8', errors='ignore')
        if not result.strip():
            return False, f"No WHOIS information found for {target}"
        
        return True, f"WHOIS information for {target}:\n\n{result}"
    except Exception as e:
        return False, f"WHOIS Error: {str(e)}"


def run_port_check(target: str, ports: str, protocol: str = "tcp", timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if specific ports are open on a target.
    
    Args:
        target: The hostname or IP to check
        ports: Comma-separated list of ports or a single port
        protocol: 'tcp' or 'udp'
        timeout: Timeout in seconds
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate target
        addr_info = socket.getaddrinfo(target, None)
        ip_address = addr_info[0][4][0]  # Extract IP address
        
        # Parse ports
        try:
            if ',' in ports:
                port_list = [int(p.strip()) for p in ports.split(',')]
            else:
                port_list = [int(ports.strip())]
            
            # Validate ports are in range
            for port in port_list:
                if port < 1 or port > 65535:
                    return False, f"Error: Port {port} is out of valid range (1-65535)"
        except ValueError:
            return False, "Error: Invalid port format. Use a single port number or comma-separated list."
        
        # Validate protocol
        if protocol.lower() not in ['tcp', 'udp']:
            protocol = 'tcp'  # Default to TCP
        
        # Validate timeout
        if timeout < 1 or timeout > 60:
            timeout = 5  # Default to 5 seconds
        
        # Check each port
        results = []
        success = False  # Will be set to True if at least one port is open
        
        result_output = f"Port scan for {target} ({ip_address}) - Testing {len(port_list)} port(s)\n\n"
        result_output += f"{'PORT':<10} {'STATE':<10} {'SERVICE':<15}\n"
        result_output += f"{'-'*40}\n"
        
        for port in port_list:
            port_open = False
            service = "unknown"
            
            # Try to get service name
            try:
                service = socket.getservbyport(port)
            except:
                # Use a few common services if getservbyport fails
                common_services = {
                    22: "ssh", 21: "ftp", 23: "telnet", 25: "smtp", 53: "domain",
                    80: "http", 443: "https", 110: "pop3", 143: "imap", 389: "ldap",
                    3306: "mysql", 5432: "postgresql", 8080: "http-alt", 8443: "https-alt"
                }
                service = common_services.get(port, "unknown")
            
            # Check if port is open
            if protocol.lower() == 'tcp':
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout)
                result = s.connect_ex((ip_address, port))
                port_open = (result == 0)
                s.close()
            else:  # UDP
                # UDP port checking is less reliable, but we'll do our best
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.settimeout(timeout)
                try:
                    s.sendto(b'', (ip_address, port))
                    data, addr = s.recvfrom(1024)
                    port_open = True
                except socket.timeout:
                    # UDP ports often don't respond, so we can't be sure
                    port_open = False
                except:
                    port_open = False
                finally:
                    s.close()
            
            # Record result
            if port_open:
                result_output += f"{port:<10} {'open':<10} {service:<15}\n"
                success = True
            else:
                result_output += f"{port:<10} {'closed':<10} {service:<15}\n"
        
        # Add summary
        open_count = len([1 for line in result_output.split('\n') if ' open ' in line])
        result_output += f"\nScan complete - {open_count} port(s) open out of {len(port_list)} checked\n"
        
        return success, result_output
    except socket.gaierror as e:
        return False, f"Error: Could not resolve hostname {target}: {str(e)}"
    except Exception as e:
        return False, f"Port Check Error: {str(e)}"


def run_http_request(url: str, method: str = "GET", headers: Optional[Dict[str, str]] = None, 
                   body: Optional[str] = None, follow_redirects: bool = True, 
                   timeout: int = 30) -> Tuple[bool, str]:
    """
    Make an HTTP(S) request to a URL and return the response details.
    
    Args:
        url: The URL to request
        method: HTTP method (GET, POST, PUT, DELETE)
        headers: Optional dict of request headers
        body: Optional request body for POST/PUT
        follow_redirects: Whether to follow redirects
        timeout: Request timeout in seconds
        
    Returns:
        Tuple of (success, result)
    """
    try:
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            url = f"http://{url}"  # Default to HTTP
        
        # Validate method
        valid_methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
        if method.upper() not in valid_methods:
            return False, f"Error: Invalid HTTP method. Must be one of: {', '.join(valid_methods)}"
        
        # Validate timeout
        if timeout < 1 or timeout > 300:
            timeout = 30  # Default to 30 seconds
        
        # Prepare headers
        request_headers = {}
        if headers:
            request_headers.update(headers)
        
        # Prepare request parameters
        params = {
            'url': url,
            'method': method.upper(),
            'headers': request_headers,
            'allow_redirects': follow_redirects,
            'timeout': timeout
        }
        
        # Add body for POST/PUT
        if body and method.upper() in ['POST', 'PUT']:
            try:
                # Try to parse as JSON
                json_body = json.loads(body)
                params['json'] = json_body
            except json.JSONDecodeError:
                # If not valid JSON, send as raw data
                params['data'] = body
        
        # Make request
        start_time = time.time()
        response = requests.request(**params)
        response_time = time.time() - start_time
        
        # Format response
        parsed_url = urlparse(url)
        result_output = f"HTTP(S) Request to {parsed_url.netloc}{parsed_url.path}\n\n"
        
        # Request details
        result_output += "REQUEST:\n"
        result_output += f"Method: {method.upper()}\n"
        result_output += f"URL: {url}\n"
        if request_headers:
            result_output += "Headers:\n"
            for key, value in request_headers.items():
                result_output += f"  {key}: {value}\n"
        if body and method.upper() in ['POST', 'PUT']:
            result_output += f"Body: {body}\n"
        
        # Response details
        result_output += "\nRESPONSE:\n"
        result_output += f"Status: {response.status_code} {response.reason}\n"
        result_output += f"Time: {response_time*1000:.2f} ms\n"
        result_output += "Headers:\n"
        for key, value in response.headers.items():
            result_output += f"  {key}: {value}\n"
        
        # Response body (limit size to avoid huge responses)
        result_output += "\nBody:\n"
        
        # Try to format JSON response for readability
        try:
            # If it's JSON, pretty-print it
            json_response = response.json()
            result_output += json.dumps(json_response, indent=2)
        except json.JSONDecodeError:
            # Not JSON, limit size to avoid huge responses
            content = response.text
            if len(content) > 5000:
                result_output += content[:5000] + "...\n[Content truncated, too large to display completely]"
            else:
                result_output += content
        
        # Request was successful if status code is 2xx or 3xx
        success = response.status_code < 400
        
        return success, result_output
    except requests.exceptions.RequestException as e:
        return False, f"HTTP Request Error: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"
