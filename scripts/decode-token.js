#!/usr/bin/env node
/**
 * ProbeOps Token Decoder
 * 
 * This script decodes a ProbeOps probe node token to display the contained environment variables.
 * Usage: node decode-token.js <TOKEN>
 */

const jwt = require('jsonwebtoken');

// Function to decode a token without verification
function decodeToken(token) {
  try {
    // Just decode the payload without verifying the signature
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      console.error('Error: Unable to decode token. Invalid format.');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error(`Error decoding token: ${error.message}`);
    return null;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('ProbeOps Token Decoder');
    console.log('======================');
    console.log('Usage: node decode-token.js <TOKEN>');
    console.log('\nThis tool decodes a ProbeOps probe node token to display the contained environment variables.');
    return;
  }
  
  const token = args[0];
  const decoded = decodeToken(token);
  
  if (decoded) {
    console.log('ProbeOps Token Decoder');
    console.log('======================');
    console.log('Token successfully decoded:');
    console.log('\nEnvironment Variables:');
    console.log('---------------------');
    
    // Display environment variables
    Object.keys(decoded).forEach(key => {
      // Skip standard JWT claims
      if (['iat', 'exp', 'nbf', 'jti', 'iss', 'sub', 'aud'].includes(key)) {
        return;
      }
      
      console.log(`${key}: ${decoded[key]}`);
    });
    
    // Display token metadata
    console.log('\nToken Metadata:');
    console.log('--------------');
    
    if (decoded.iat) {
      console.log(`Issued at: ${new Date(decoded.iat * 1000).toLocaleString()}`);
    }
    
    if (decoded.exp) {
      console.log(`Expires at: ${new Date(decoded.exp * 1000).toLocaleString()}`);
      
      // Calculate and display remaining time
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded.exp - now;
      
      if (remainingSeconds > 0) {
        const days = Math.floor(remainingSeconds / 86400);
        const hours = Math.floor((remainingSeconds % 86400) / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        
        console.log(`Expires in: ${days} days, ${hours} hours, ${minutes} minutes`);
      } else {
        console.log('Token has expired');
      }
    } else {
      console.log('Token does not expire');
    }
  }
}

main();