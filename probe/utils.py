import logging
import subprocess
import socket
from logging.handlers import RotatingFileHandler
import os
import time
from ping3 import ping

def setup_logging():
    """Setup logging configuration"""
    log_dir = os.getenv("LOG_DIR", "/var/log/probeops")
    log_level = os.getenv("LOG_LEVEL", "INFO")
    
    # Ensure log directory exists
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure logger
    logger = logging.getLogger("probe")
    logger.setLevel(getattr(logging, log_level))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(console_handler)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        f"{log_dir}/probe.log",
        maxBytes=10485760,  # 10 MB
        backupCount=5
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(file_handler)
    
    return logger

def run_ping(target, count=4):
    """Run ping using ping3 library"""
    try:
        # Validate target to avoid issues
        socket.getaddrinfo(target, None)
        
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

def run_diagnostic_command(tool, target):
    """Run a diagnostic command locally"""
    try:
        # Validate target to avoid command injection
        socket.getaddrinfo(target, None)
        
        if tool == "ping":
            # Use ping3 library instead of system ping command
            return run_ping(target, 4)
        elif tool == "traceroute":
            cmd = ["traceroute", "-m", "30", target]
        elif tool == "dns":
            cmd = ["dig", target]
        elif tool == "curl":
            cmd = ["curl", "-I", f"http://{target}"]
        else:
            return False, f"Unsupported tool: {tool}"
        
        # Run the command
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Check if command was successful based on return code
        success = result.returncode == 0
        output = result.stdout
        
        return success, output
    
    except socket.gaierror:
        return False, f"Invalid host: {target}"
    except subprocess.TimeoutExpired:
        return False, f"Command timed out: {tool} {target}"
    except subprocess.SubprocessError as e:
        return False, f"Command error: {e}"
    except Exception as e:
        return False, f"Unexpected error: {e}"
