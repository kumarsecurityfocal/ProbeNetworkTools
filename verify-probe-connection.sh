#!/bin/bash
# ProbeOps Probe Node Connection Verification Script
# This script verifies connectivity between a probe node and the ProbeOps backend

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default backend URL
BACKEND_URL="https://probeops.com"

# Default tests to run
RUN_HTTP_TEST=true
RUN_WEBSOCKET_TEST=true
RUN_TLS_TEST=true
RUN_DNS_TEST=true
RUN_TRACEROUTE_TEST=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -u|--url)
      BACKEND_URL="$2"
      shift 2
      ;;
    --no-http)
      RUN_HTTP_TEST=false
      shift
      ;;
    --no-websocket)
      RUN_WEBSOCKET_TEST=false
      shift
      ;;
    --no-tls)
      RUN_TLS_TEST=false
      shift
      ;;
    --no-dns)
      RUN_DNS_TEST=false
      shift
      ;;
    --no-traceroute)
      RUN_TRACEROUTE_TEST=false
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [-u|--url BACKEND_URL] [--no-http] [--no-websocket] [--no-tls] [--no-dns] [--no-traceroute]"
      echo ""
      echo "Options:"
      echo "  -u, --url BACKEND_URL    Backend URL to test (default: https://probeops.com)"
      echo "  --no-http                Skip HTTP connectivity test"
      echo "  --no-websocket           Skip WebSocket connectivity test"
      echo "  --no-tls                 Skip TLS certificate test"
      echo "  --no-dns                 Skip DNS resolution test"
      echo "  --no-traceroute          Skip traceroute test"
      echo "  -h, --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Extract domain from URL
DOMAIN=$(echo "$BACKEND_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||' | sed -E 's|:[0-9]+$||')

# Check for required tools
check_tool() {
  command -v "$1" >/dev/null 2>&1 || { echo -e "${RED}Error: $1 is required but not installed.${NC}"; return 1; }
  return 0
}

echo -e "${BLUE}======= ProbeOps Probe Node Connection Verification =======${NC}"
echo -e "${BLUE}Backend URL: ${YELLOW}$BACKEND_URL${NC}"
echo -e "${BLUE}Domain: ${YELLOW}$DOMAIN${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
MISSING_TOOLS=0

# Common tools
check_tool curl || MISSING_TOOLS=$((MISSING_TOOLS + 1))

# DNS tools
if $RUN_DNS_TEST; then
  check_tool dig || check_tool nslookup || { echo -e "${YELLOW}Warning: Neither dig nor nslookup is available. DNS tests will be limited.${NC}"; }
fi

# TLS tools
if $RUN_TLS_TEST; then
  check_tool openssl || { echo -e "${YELLOW}Warning: openssl is not available. TLS tests will be skipped.${NC}"; RUN_TLS_TEST=false; }
fi

# Traceroute tools
if $RUN_TRACEROUTE_TEST; then
  check_tool traceroute || check_tool tracepath || { echo -e "${YELLOW}Warning: Neither traceroute nor tracepath is available. Traceroute tests will be skipped.${NC}"; RUN_TRACEROUTE_TEST=false; }
fi

# WebSocket tools
if $RUN_WEBSOCKET_TEST; then
  check_tool websocat || check_tool wscat || { echo -e "${YELLOW}Warning: Neither websocat nor wscat is available. WebSocket tests will be skipped.${NC}"; RUN_WEBSOCKET_TEST=false; }
fi

if [[ $MISSING_TOOLS -gt 0 ]]; then
  echo -e "${RED}Error: Some required tools are missing. Please install them and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All required tools are available${NC}"
echo ""

# 1. DNS resolution test
if $RUN_DNS_TEST; then
  echo -e "${BLUE}Testing DNS resolution for ${YELLOW}$DOMAIN${NC}"
  
  if command -v dig >/dev/null 2>&1; then
    DNS_RESULT=$(dig +short "$DOMAIN" 2>&1)
  elif command -v nslookup >/dev/null 2>&1; then
    DNS_RESULT=$(nslookup "$DOMAIN" 2>&1 | grep -A 10 'Name:' | grep 'Address:' | head -1 | awk '{print $2}')
  else
    DNS_RESULT=$(getent hosts "$DOMAIN" 2>&1 | awk '{print $1}')
  fi
  
  if [[ -n "$DNS_RESULT" ]]; then
    echo -e "${GREEN}✓ DNS resolution successful${NC}"
    echo -e "  IP Address: $DNS_RESULT"
  else
    echo -e "${RED}✗ Failed to resolve domain name${NC}"
    echo "  Check your DNS configuration or try using IP address directly."
  fi
  echo ""
fi

# 2. HTTP API connectivity test
if $RUN_HTTP_TEST; then
  echo -e "${BLUE}Testing HTTP connectivity to ${YELLOW}$BACKEND_URL${NC}"
  
  # Test health endpoint
  HTTP_RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" 2>&1)
  
  if [[ "$HTTP_RESULT" -ge 200 && "$HTTP_RESULT" -lt 400 ]]; then
    echo -e "${GREEN}✓ HTTP connectivity successful${NC}"
    echo -e "  Response code: $HTTP_RESULT"
  else
    echo -e "${RED}✗ HTTP connectivity failed${NC}"
    echo -e "  Response code: $HTTP_RESULT"
    
    # Try alternative endpoints
    ALT_RESULT=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>&1)
    if [[ "$ALT_RESULT" -ge 200 && "$ALT_RESULT" -lt 400 ]]; then
      echo -e "${GREEN}✓ Alternative endpoint /health is accessible${NC}"
    else
      echo -e "${RED}✗ Alternative endpoint /health is not accessible${NC}"
    fi
  fi
  echo ""
fi

# 3. TLS certificate verification
if $RUN_TLS_TEST; then
  echo -e "${BLUE}Testing TLS certificate for ${YELLOW}$DOMAIN${NC}"
  
  TLS_OUTPUT=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>&1)
  CERT_VERIFY=$(echo "$TLS_OUTPUT" | grep -E "Verify return code:")
  
  if echo "$CERT_VERIFY" | grep -q "0 (ok)"; then
    echo -e "${GREEN}✓ TLS certificate is valid${NC}"
    
    # Extract and show certificate details
    CERT_SUBJECT=$(echo "$TLS_OUTPUT" | grep "subject=" | sed 's/.*subject=//')
    CERT_ISSUER=$(echo "$TLS_OUTPUT" | grep "issuer=" | sed 's/.*issuer=//')
    CERT_DATES=$(echo "$TLS_OUTPUT" | grep -E "Not (Before|After)" | sed 's/^[[:space:]]*//')
    
    echo -e "  Subject: $CERT_SUBJECT"
    echo -e "  Issuer: $CERT_ISSUER"
    echo -e "  $CERT_DATES"
  else
    echo -e "${RED}✗ TLS certificate validation failed${NC}"
    echo -e "  $CERT_VERIFY"
    echo -e "  This may cause connection issues with the probe node."
  fi
  echo ""
fi

# 4. Network path test
if $RUN_TRACEROUTE_TEST; then
  echo -e "${BLUE}Testing network path to ${YELLOW}$DOMAIN${NC}"
  
  if command -v traceroute >/dev/null 2>&1; then
    # Limit to 15 hops max and 2 second timeout
    TRACE_OUTPUT=$(traceroute -m 15 -w 2 "$DOMAIN" 2>&1)
  elif command -v tracepath >/dev/null 2>&1; then
    TRACE_OUTPUT=$(tracepath -m 15 "$DOMAIN" 2>&1)
  else
    TRACE_OUTPUT="Traceroute tool not available"
  fi
  
  echo "$TRACE_OUTPUT" | head -10
  
  if [[ $(echo "$TRACE_OUTPUT" | wc -l) -gt 10 ]]; then
    echo "... (truncated for brevity) ..."
  fi
  
  # Check if traceroute completed successfully
  if echo "$TRACE_OUTPUT" | grep -q "$DOMAIN"; then
    echo -e "${GREEN}✓ Network path tracing completed${NC}"
    
    # Extract hop count
    HOP_COUNT=$(echo "$TRACE_OUTPUT" | grep -c "^ *[0-9]")
    echo -e "  Path length: approximately $HOP_COUNT hops"
  else
    echo -e "${YELLOW}⚠ Network path tracing incomplete${NC}"
    echo -e "  The trace did not reach the destination within the limit."
  fi
  echo ""
fi

# 5. WebSocket connectivity test
if $RUN_WEBSOCKET_TEST; then
  echo -e "${BLUE}Testing WebSocket connectivity to ${YELLOW}$BACKEND_URL${NC}"
  
  # Form the WebSocket URL
  WS_URL=$(echo "$BACKEND_URL" | sed 's/^http/ws/')
  WS_URL="$WS_URL/ws/node"
  
  echo -e "WebSocket URL: $WS_URL"
  
  # Try to connect with timeout
  if command -v websocat >/dev/null 2>&1; then
    timeout 5s websocat -v --no-close "$WS_URL" 2>&1 | head -3
    WS_EXIT_CODE=$?
  elif command -v wscat >/dev/null 2>&1; then
    timeout 5s wscat -c "$WS_URL" 2>&1 | head -3
    WS_EXIT_CODE=$?
  else
    echo -e "${YELLOW}WebSocket test skipped (no tools available)${NC}"
    WS_EXIT_CODE=1
  fi
  
  if [[ $WS_EXIT_CODE -eq 124 ]]; then
    # Timeout occurred, which likely means connection was established
    echo -e "${GREEN}✓ WebSocket connection established (timed out while waiting)${NC}"
  elif [[ $WS_EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}✓ WebSocket connection successful${NC}"
  else
    echo -e "${RED}✗ WebSocket connection failed${NC}"
    echo -e "  This will prevent the probe node from communicating with the backend."
    echo -e "  Verify that WebSockets are enabled on your server and not blocked by any firewall."
  fi
  echo ""
fi

# Summary
echo -e "${BLUE}======= Connection Test Summary =======${NC}"
echo -e "Backend URL: $BACKEND_URL"

if $RUN_DNS_TEST && [[ -n "$DNS_RESULT" ]]; then
  echo -e "${GREEN}✓ DNS resolution: OK${NC}"
else
  echo -e "${RED}✗ DNS resolution: Failed${NC}"
fi

if $RUN_HTTP_TEST && [[ "$HTTP_RESULT" -ge 200 && "$HTTP_RESULT" -lt 400 ]] || [[ "$ALT_RESULT" -ge 200 && "$ALT_RESULT" -lt 400 ]]; then
  echo -e "${GREEN}✓ HTTP connectivity: OK${NC}"
else
  echo -e "${RED}✗ HTTP connectivity: Failed${NC}"
fi

if $RUN_TLS_TEST && echo "$CERT_VERIFY" | grep -q "0 (ok)"; then
  echo -e "${GREEN}✓ TLS certificate: Valid${NC}"
else
  echo -e "${RED}✗ TLS certificate: Invalid or test skipped${NC}"
fi

# WebSocket success is approximated based on timeout
if $RUN_WEBSOCKET_TEST && [[ $WS_EXIT_CODE -eq 124 || $WS_EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✓ WebSocket connectivity: OK${NC}"
else
  echo -e "${RED}✗ WebSocket connectivity: Failed or test skipped${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
if [[ "$HTTP_RESULT" -ge 200 && "$HTTP_RESULT" -lt 400 ]] || [[ "$ALT_RESULT" -ge 200 && "$ALT_RESULT" -lt 400 ]]; then
  echo -e "1. Verify your API key and node UUID are correct"
  echo -e "2. Run the probe node using: ./deploy-probe.sh"
  echo -e "3. Check probe node logs for successful connection"
else
  echo -e "1. Verify the backend URL is correct"
  echo -e "2. Check network connectivity and firewall rules"
  echo -e "3. Ensure the backend server is running and accepting connections"
fi

exit 0