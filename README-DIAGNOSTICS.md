# ProbeOps AWS Authentication Diagnostics

This package contains diagnostic tools to help identify the exact authentication and routing issues in your AWS deployment.

## Step 1: Run the Diagnostic Collector

First, upload and run the diagnostic collector on your AWS server:

```bash
# Copy the file to your server
scp aws-collector.js user@your-aws-server:/opt/probeops/

# SSH into your server
ssh user@your-aws-server

# Navigate to the ProbeOps directory
cd /opt/probeops

# Run the collector
node aws-collector.js
```

This will generate a `probeops-diagnosis.json` file with comprehensive information about:

- System configuration
- Network connectivity
- Path handling behavior
- Authentication flow issues
- Error logs from relevant services

## Step 2: Share the Diagnostic Data

Download the diagnostic file from your server and share it with us:

```bash
# From your local machine
scp user@your-aws-server:/opt/probeops/probeops-diagnosis.json .
```

## Step 3: Wait for Analysis

Once we receive the diagnostic data, we'll analyze it to identify:

1. Exact path handling issues (duplicate /api prefixes)
2. Authentication token generation and validation problems
3. Backend connectivity issues
4. Any system or environment configuration problems

## Step 4: Receive Tailored Fix

Based on the actual data from your environment, we'll provide a tailored fix that specifically addresses the issues identified in your AWS deployment.

## Why This Approach Works

Rather than making educated guesses based on limited information, this approach:

1. Collects actual behavior data from your production environment
2. Tests specific paths and authentication workflows
3. Gathers relevant system configuration and error logs
4. Enables us to create a fix that directly addresses your specific issues