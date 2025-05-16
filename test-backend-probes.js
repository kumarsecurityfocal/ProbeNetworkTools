/**
 * Test script for ProbeOps backend API connections
 * This script tests the connectivity between the frontend and backend
 * for probe node management and scheduled probes
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const API_URL = 'http://localhost:8000'; // Backend API URL
const API_ENDPOINTS = [
  '/probes',
  '/probe-nodes',
  '/subscription-tiers',
  '/users/me'
];

// User credentials for testing
let token = null;
let username = 'admin';
let password = 'admin';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get auth token
async function login() {
  try {
    console.log(`\nAttempting to log in as ${username}...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });
    token = response.data.access_token;
    console.log('\n✅ Login successful!');
    console.log(`Token: ${token.substring(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('\n❌ Login failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test probe node API endpoints
async function testProbeNodeEndpoints() {
  console.log('\n\n========== TESTING PROBE NODE ENDPOINTS ==========');
  try {
    // Test getting all probe nodes
    console.log('\nTesting GET /probe-nodes');
    const probeNodesResponse = await axios.get(`${API_URL}/probe-nodes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ GET /probe-nodes successful');
    console.log(`Found ${probeNodesResponse.data.length || 0} probe nodes`);
    
    // Test getting registration tokens
    console.log('\nTesting GET /probe-nodes/registration-token');
    const tokensResponse = await axios.get(`${API_URL}/probe-nodes/registration-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ GET /probe-nodes/registration-token successful');
    console.log(`Found ${tokensResponse.data.length || 0} registration tokens`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Probe node API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test scheduled probes API endpoints
async function testScheduledProbesEndpoints() {
  console.log('\n\n========== TESTING SCHEDULED PROBES ENDPOINTS ==========');
  try {
    // Test getting all scheduled probes
    console.log('\nTesting GET /probes');
    const probesResponse = await axios.get(`${API_URL}/probes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ GET /probes successful');
    console.log(`Found ${probesResponse.data.length || 0} scheduled probes`);
    
    // Try to create a test probe
    console.log('\nTesting POST /probes (Create new scheduled probe)');
    const probeData = {
      name: 'API Test Probe',
      description: 'Created by test script',
      tool: 'ping',
      target: 'google.com',
      interval_minutes: 60,
      is_active: true
    };
    
    const createResponse = await axios.post(`${API_URL}/probes`, probeData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ POST /probes successful');
    console.log('Created probe:', createResponse.data);
    
    // If successful, test deleting the probe
    if (createResponse.data && createResponse.data.id) {
      console.log(`\nTesting DELETE /probes/${createResponse.data.id}`);
      const deleteResponse = await axios.delete(`${API_URL}/probes/${createResponse.data.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ DELETE /probes successful');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Scheduled probes API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
      
      // Try alternative endpoints if 405 Method Not Allowed
      if (error.response.status === 405 && error.config.url.includes('/probes') && error.config.method === 'post') {
        console.log('\nTrying alternative endpoint POST /scheduled-probes');
        try {
          const probeData = {
            name: 'API Test Probe',
            description: 'Created by test script',
            tool: 'ping',
            target: 'google.com',
            interval_minutes: 60,
            is_active: true
          };
          
          const altResponse = await axios.post(`${API_URL}/scheduled-probes`, probeData, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('✅ POST /scheduled-probes successful');
          console.log('Created probe:', altResponse.data);
          return true;
        } catch (altError) {
          console.error('Alternative endpoint also failed:', altError.message);
        }
      }
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Test subscription API endpoints
async function testSubscriptionEndpoints() {
  console.log('\n\n========== TESTING SUBSCRIPTION ENDPOINTS ==========');
  try {
    // Test getting subscription tiers
    console.log('\nTesting GET /subscription-tiers');
    const tiersResponse = await axios.get(`${API_URL}/subscription-tiers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ GET /subscription-tiers successful');
    console.log(`Found ${tiersResponse.data.length || 0} subscription tiers`);
    
    // Test getting user subscription
    console.log('\nTesting GET /subscription');
    const subscriptionResponse = await axios.get(`${API_URL}/subscription`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ GET /subscription successful');
    console.log('User subscription:', subscriptionResponse.data);
    
    return true;
  } catch (error) {
    console.error('\n❌ Subscription API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
      
      // Try alternative endpoints
      if (error.response.status === 404) {
        const endpoint = error.config.url.includes('subscription-tiers') ? 'tiers' : 'subscriptions';
        console.log(`\nTrying alternative endpoint GET /${endpoint}`);
        try {
          const altResponse = await axios.get(`${API_URL}/${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log(`✅ GET /${endpoint} successful`);
          console.log('Response:', altResponse.data);
          return true;
        } catch (altError) {
          console.error('Alternative endpoint also failed:', altError.message);
        }
      }
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Main function to run tests
async function runTests() {
  try {
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('\nLogin failed. Please check your credentials and API connection.');
      rl.close();
      return;
    }
    
    // Run all tests
    await testProbeNodeEndpoints();
    await testScheduledProbesEndpoints();
    await testSubscriptionEndpoints();
    
    console.log('\n\n========== API TEST SUMMARY ==========');
    console.log('API connection tests completed successfully!');
    console.log('If any tests failed, please check the error messages above.\n');
    
    rl.close();
  } catch (error) {
    console.error('Test error:', error);
    rl.close();
  }
}

// Ask for credentials
console.log('\n===== ProbeOps API Test Utility =====');
console.log('This script will test the connectivity to your ProbeOps backend API.');
console.log('Default credentials: admin / admin');

rl.question('\nDo you want to use default credentials? (Y/n): ', (answer) => {
  if (answer.toLowerCase() === 'n') {
    rl.question('Username: ', (user) => {
      username = user;
      rl.question('Password: ', (pass) => {
        password = pass;
        runTests();
      });
    });
  } else {
    runTests();
  }
});