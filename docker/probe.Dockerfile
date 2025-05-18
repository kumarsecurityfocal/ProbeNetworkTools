FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for network tools
RUN apt-get update && apt-get install -y \
    iputils-ping \
    dnsutils \
    traceroute \
    nmap \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy probe requirements
COPY probe/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the probe code
COPY probe/ .

# Expose the probe service port
EXPOSE 9000

# Set environment variables for development mode
ENV DEV_MODE=true
ENV AUTH_BYPASS=true
ENV NODE_UUID=dev-probe-node
ENV NODE_NAME=Development Probe

# Command to run the probe service
CMD ["python", "run.py"]