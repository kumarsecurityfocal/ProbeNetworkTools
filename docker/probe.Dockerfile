FROM node:20-slim

WORKDIR /app

# Set environment variables
ENV NODE_ENV=development \
    AUTH_BYPASS=true \
    PROBE_ID=dev-probe-01

# Copy probe package.json
COPY probe/package*.json ./

# Install dependencies
RUN npm install

# Copy the probe code
COPY probe/ ./

# Install additional diagnostic tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    iputils-ping \
    traceroute \
    dnsutils \
    curl \
    net-tools \
    nmap \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 9000

# Start the probe service
CMD ["node", "probe.js"]