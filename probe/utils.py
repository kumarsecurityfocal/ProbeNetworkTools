import logging
import subprocess
import socket
from logging.handlers import RotatingFileHandler
import os

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

def run_diagnostic_command(tool, target):
    """Run a diagnostic command locally"""
    try:
        # Validate target to avoid command injection
        socket.getaddrinfo(target, None)
        
        if tool == "ping":
            cmd = ["ping", "-c", "4", target]
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
