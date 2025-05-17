/**
 * Authentication Token Checker for ProbeOps
 * 
 * This script examines authentication issues by:
 * 1. Testing the backend login endpoint
 * 2. Verifying proper token generation
 * 3. Checking token structure and validation
 * 
 * Run this script directly in your environment to diagnose auth issues:
 * node auth-token-checker.js
 */

const axios = require('axios');

// Config - adjust these based on your environment
const config = {
  backend: 'http://localhost:8000',
  loginEndpoint: '/login',
  userEndpoint: '/users/me',
  credentials: {
    username: 'admin@probeops.com',
    password: 'probeopS1@'
  }
};

async function checkAuthTokenFlow() {
  console.log('===== ProbeOps Authentication Token Checker =====');
  console.log('Checking authentication flow for:', config.credentials.username);
  console.log('Backend URL:', config.backend);
  
  try {
    // Step 1: Attempt Login
    console.log('\n1. Testing login endpoint...');
    
    // Create form data for login
    const formData = new URLSearchParams();
    formData.append('username', config.credentials.username);
    formData.append('password', config.credentials.password);
    
    // Make login request
    const loginResponse = await axios.post(
      `${config.backend}${config.loginEndpoint}`, 
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (loginResponse.status !== 200) {
      console.error('Login failed with status:', loginResponse.status);
      return;
    }
    
    console.log('✅ Login successful!');
    
    // Check if response has token
    const token = loginResponse.data.access_token;
    if (!token) {
      console.error('❌ No access_token in response. Response data:', loginResponse.data);
      return;
    }
    
    console.log('✅ Token received:', token.substring(0, 15) + '...');
    
    // Step 2: Check token structure
    console.log('\n2. Analyzing token structure...');
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format. Expected 3 parts, got:', parts.length);
      return;
    }
    
    console.log('✅ Valid JWT structure (header.payload.signature)');
    
    try {
      // Decode payload (middle part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('✅ Token payload:', payload);
      
      // Check expiration
      if (payload.exp) {
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const timeLeft = Math.floor((expiresAt - now) / 1000 / 60); // minutes
        
        console.log(`✅ Token expires at ${expiresAt.toISOString()} (${timeLeft} minutes from now)`);
        
        if (timeLeft < 5) {
          console.warn('⚠️ Warning: Token expires very soon!');
        }
      } else {
        console.warn('⚠️ Warning: No expiration time in token');
      }
    } catch (e) {
      console.error('❌ Error decoding token payload:', e.message);
    }
    
    // Step 3: Test API access with token
    console.log('\n3. Testing API access with token...');
    
    try {
      const userResponse = await axios.get(
        `${config.backend}${config.userEndpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ User profile request successful:', userResponse.status);
      console.log('User data:', userResponse.data);
    } catch (error) {
      console.error('❌ User profile request failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
      }
    }
    
    // Step 4: Check alternative endpoints
    console.log('\n4. Testing alternative user endpoints...');
    
    const alternativeEndpoints = [
      '/user',
      '/api/user',
      '/api/users/me',
      '/users/profile'
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}...`);
        const response = await axios.get(
          `${config.backend}${endpoint}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log(`✅ Endpoint ${endpoint} worked! Status:`, response.status);
        console.log('Response data:', response.data);
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
      }
    }
    
    console.log('\n===== Authentication Check Complete =====');
  } catch (error) {
    console.error('Authentication check failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the check
checkAuthTokenFlow().catch(console.error);