/**
 * JWT Authentication Fix for ProbeOps
 * 
 * This script helps resolve authentication issues by:
 * 1. Testing authentication flow with logging
 * 2. Creating valid JWT tokens for troubleshooting
 * 3. Providing diagnostics on token structure
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3333;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple HTML interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>JWT Authentication Fix</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
        button { padding: 8px 16px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        input[type="text"] { padding: 8px; width: 70%; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>JWT Authentication Fix</h1>
        
        <div class="section">
          <h2>Generate Admin Token</h2>
          <p>Create a valid JWT token for admin user</p>
          <button onclick="generateToken()">Generate Token</button>
          <div id="token-result"></div>
        </div>
        
        <div class="section">
          <h2>Analyze Token</h2>
          <p>Paste a JWT token to analyze its structure and validity</p>
          <input type="text" id="token-input" placeholder="eyJhbGci...">
          <button onclick="analyzeToken()">Analyze</button>
          <pre id="analyze-result"></pre>
        </div>
        
        <div class="section">
          <h2>Test Authentication</h2>
          <p>Test the complete authentication flow with detailed logging</p>
          <button onclick="testAuth()">Test Auth Flow</button>
          <pre id="auth-result"></pre>
        </div>
      </div>
      
      <script>
        // Call our API endpoints
        async function generateToken() {
          document.getElementById('token-result').innerHTML = 'Generating token...';
          
          try {
            const response = await fetch('/generate-token');
            const data = await response.json();
            
            if (data.token) {
              document.getElementById('token-result').innerHTML = \`
                <p>Token generated successfully:</p>
                <pre>\${data.token}</pre>
                <p>Copy this token for use in the Authorization header:</p>
                <code>Authorization: Bearer \${data.token}</code>
                <p><button onclick="copyToClipboard('\${data.token}')">Copy Token</button></p>
              \`;
            } else {
              document.getElementById('token-result').innerHTML = 'Error generating token: ' + data.error;
            }
          } catch (error) {
            document.getElementById('token-result').innerHTML = 'Error: ' + error.message;
          }
        }
        
        async function analyzeToken() {
          const token = document.getElementById('token-input').value.trim();
          if (!token) {
            document.getElementById('analyze-result').textContent = 'Please enter a token to analyze';
            return;
          }
          
          document.getElementById('analyze-result').textContent = 'Analyzing token...';
          
          try {
            const response = await fetch('/analyze-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            document.getElementById('analyze-result').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('analyze-result').textContent = 'Error: ' + error.message;
          }
        }
        
        async function testAuth() {
          document.getElementById('auth-result').textContent = 'Testing authentication flow...';
          
          try {
            const response = await fetch('/test-auth-flow');
            const data = await response.json();
            document.getElementById('auth-result').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('auth-result').textContent = 'Error: ' + error.message;
          }
        }
        
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            alert('Token copied to clipboard');
          }).catch(err => {
            console.error('Failed to copy: ', err);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Generate a JWT token
app.get('/generate-token', (req, res) => {
  try {
    // Create token header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // Create token payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'admin@probeops.com',
      exp: now + 86400, // Valid for 24 hours
      iat: now
    };
    
    // Use a hardcoded secret (for testing only)
    const secret = process.env.JWT_SECRET || 'development_secret_key';
    
    // Create the JWT token
    const base64UrlEncode = (str) => {
      return Buffer.from(JSON.stringify(str))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };
    
    const header64 = base64UrlEncode(header);
    const payload64 = base64UrlEncode(payload);
    
    // Calculate signature
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header64}.${payload64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const token = `${header64}.${payload64}.${signature}`;
    
    // Log the token details
    console.log('Generated token for admin@probeops.com');
    console.log('Token expiration:', new Date((now + 86400) * 1000).toISOString());
    
    res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze a JWT token
app.post('/analyze-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }
    
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ 
        error: 'Invalid token format',
        structure: 'Expected 3 parts (header.payload.signature)',
        parts_found: parts.length
      });
    }
    
    // Decode header and payload
    let header, payload;
    
    try {
      // Parse the Base64URL encoded header
      const headerStr = Buffer.from(parts[0], 'base64').toString();
      header = JSON.parse(headerStr);
    } catch (error) {
      header = { error: 'Could not decode header: ' + error.message };
    }
    
    try {
      // Parse the Base64URL encoded payload
      const payloadStr = Buffer.from(parts[1], 'base64').toString();
      payload = JSON.parse(payloadStr);
    } catch (error) {
      payload = { error: 'Could not decode payload: ' + error.message };
    }
    
    // Validate the token
    const now = Math.floor(Date.now() / 1000);
    const validation = {
      format: 'Valid JWT format (3 parts)',
      signature_length: parts[2].length,
      expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration set',
      expired: payload.exp ? (payload.exp < now) : 'Unknown',
      issued_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'No issue time set',
      subject: payload.sub || 'No subject set'
    };
    
    res.json({
      header,
      payload,
      validation,
      raw_parts: {
        header: parts[0],
        payload: parts[1],
        signature: parts[2]
      }
    });
  } catch (error) {
    console.error('Token analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test the authentication flow
app.get('/test-auth-flow', async (req, res) => {
  const results = {
    stages: [],
    overall_result: 'Unknown'
  };
  
  // Stage 1: Generate a test token
  try {
    results.stages.push({
      stage: 'Generate Token',
      status: 'Running'
    });
    
    // Create a valid token (simplified)
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: 'admin@probeops.com',
      exp: now + 86400,
      iat: now
    };
    
    const base64UrlEncode = (str) => {
      return Buffer.from(JSON.stringify(str))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };
    
    const header64 = base64UrlEncode(header);
    const payload64 = base64UrlEncode(payload);
    const signature = 'test-signature-for-diagnostics';
    
    const token = `${header64}.${payload64}.${signature}`;
    
    results.stages[0].status = 'Success';
    results.stages[0].token = token;
    results.stages[0].payload = payload;
    
    // Stage 2: Test backend connection
    results.stages.push({
      stage: 'Test Backend Connection',
      status: 'Running'
    });
    
    try {
      // Try connecting to the backend
      const backendUrl = 'http://localhost:8000/health';
      const response = await fetch(backendUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }).catch(error => {
        throw new Error(`Connection failed: ${error.message}`);
      });
      
      // Check if response is JSON
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        results.stages[1].status = 'Success';
        results.stages[1].response = responseData;
      } else {
        const text = await response.text();
        results.stages[1].status = 'Warning';
        results.stages[1].error = 'Non-JSON response';
        results.stages[1].response_type = contentType || 'unknown';
        results.stages[1].response_text = text.substring(0, 500) + (text.length > 500 ? '...' : '');
      }
    } catch (error) {
      results.stages[1].status = 'Failed';
      results.stages[1].error = error.message;
    }
    
    // Stage 3: Test login endpoint
    results.stages.push({
      stage: 'Test Login Endpoint',
      status: 'Running'
    });
    
    try {
      // Try a login request with test credentials
      const loginUrl = 'http://localhost:8000/login';
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin@probeops.com',
          password: 'AdminPassword123'
        })
      }).catch(error => {
        throw new Error(`Login request failed: ${error.message}`);
      });
      
      // Check response
      let loginData;
      const loginContentType = loginResponse.headers.get('content-type');
      
      if (loginContentType && loginContentType.includes('application/json')) {
        loginData = await loginResponse.json();
        results.stages[2].status = loginResponse.ok ? 'Success' : 'Failed';
        results.stages[2].response = loginData;
      } else {
        const text = await loginResponse.text();
        results.stages[2].status = 'Warning';
        results.stages[2].error = 'Non-JSON response from login endpoint';
        results.stages[2].response_type = loginContentType || 'unknown';
        results.stages[2].response_text = text.substring(0, 500) + (text.length > 500 ? '...' : '');
      }
    } catch (error) {
      results.stages[2].status = 'Failed';
      results.stages[2].error = error.message;
    }
    
    // Calculate overall result
    const allSuccess = results.stages.every(stage => stage.status === 'Success');
    const anyFailed = results.stages.some(stage => stage.status === 'Failed');
    
    if (allSuccess) {
      results.overall_result = 'Success';
    } else if (anyFailed) {
      results.overall_result = 'Failed';
    } else {
      results.overall_result = 'Warning';
    }
    
    res.json(results);
  } catch (error) {
    console.error('Auth flow test error:', error);
    results.stages.push({
      stage: 'Error',
      status: 'Failed',
      error: error.message
    });
    results.overall_result = 'Failed';
    
    res.status(500).json(results);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`JWT Authentication Fix Tool running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to use the tool`);
});