#!/usr/bin/env node

/**
 * ProbeOps Probe Token Generator
 * 
 * This script generates a token that encodes all necessary environment variables
 * for a probe node deployment. When the probe node is deployed with this token,
 * it can automatically extract and use these environment variables instead of
 * requiring them to be set manually.
 * 
 * Usage:
 * node generate-probe-token.js --node-uuid UUID --api-key KEY [--backend URL]
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Secret key for signing the token - should match the one used by the probe node
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";

// Parse command line arguments
const args = process.argv.slice(2);
let nodeUuid = null;
let apiKey = null;
let backendUrl = process.env.BACKEND_URL || 'https://probeops.com';
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--node-uuid' && i + 1 < args.length) {
    nodeUuid = args[i + 1];
    i++;
  } else if (args[i] === '--api-key' && i + 1 < args.length) {
    apiKey = args[i + 1];
    i++;
  } else if (args[i] === '--backend' && i + 1 < args.length) {
    backendUrl = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  }
}

// Function to prompt for input if not provided as command line arguments
async function promptForInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    if (!nodeUuid) {
      rl.question('Enter the node UUID: ', (answer) => {
        nodeUuid = answer.trim();
        if (!apiKey) {
          rl.question('Enter the API key: ', (answer) => {
            apiKey = answer.trim();
            rl.close();
            resolve();
          });
        } else {
          rl.close();
          resolve();
        }
      });
    } else if (!apiKey) {
      rl.question('Enter the API key: ', (answer) => {
        apiKey = answer.trim();
        rl.close();
        resolve();
      });
    } else {
      rl.close();
      resolve();
    }
  });
}

// Main function
async function main() {
  // If required parameters are missing, prompt for them
  if (!nodeUuid || !apiKey) {
    await promptForInput();
  }

  // Verify we have the required parameters
  if (!nodeUuid || !apiKey) {
    console.error('Error: Node UUID and API key are required');
    process.exit(1);
  }

  // Create the payload with all necessary environment variables
  const payload = {
    // Probe identification
    NODE_UUID: nodeUuid,
    API_KEY: apiKey,
    
    // Connection details
    BACKEND_URL: backendUrl,
    
    // Authentication
    AUTH_TYPE: 'token',
    
    // Additional configuration (these can be customized)
    LOG_LEVEL: 'info',
    PROBE_VERSION: '1.0.0',
    
    // Token expiration (30 days)
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  };

  // Sign the token
  const token = jwt.sign(payload, JWT_SECRET);
  
  // Output the token
  console.log('\n=== ProbeOps Probe Configuration Token ===');
  console.log(`\nNode UUID: ${nodeUuid}`);
  console.log(`Backend URL: ${backendUrl}`);
  console.log(`Token: ${token}`);
  console.log('\nUse this token to configure your probe node by running:');
  console.log(`python run_probe_node.py --token "${token}"`);
  
  // If an output file was specified, save the token to that file
  if (outputFile) {
    try {
      fs.writeFileSync(outputFile, token);
      console.log(`\nToken saved to ${outputFile}`);
    } catch (err) {
      console.error(`Error saving token to file: ${err.message}`);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});