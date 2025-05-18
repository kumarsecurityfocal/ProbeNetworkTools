/**
 * Simple script to run the frontend directly using Vite
 * This bypasses NGINX and connects directly to the backend API
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = path.join(__dirname, '../frontend');

// Check if frontend directory exists
if (!fs.existsSync(frontendDir)) {
  console.error(`Frontend directory not found: ${frontendDir}`);
  process.exit(1);
}

console.log('====== ProbeOps Direct Frontend Runner ======');
console.log('Starting frontend in development mode...');
console.log(`Frontend directory: ${frontendDir}`);
console.log('API requests will be proxied to http://localhost:8000');
console.log('===========================================');

// Change to frontend directory
process.chdir(frontendDir);

// Run vite dev server
const viteProcess = spawn('npx', ['vite', '--port', '3000', '--host'], {
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Vite dev server:', error);
});

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Vite dev server exited with code ${code}`);
  }
});

console.log('Vite dev server started on port 3000');
console.log('Press Ctrl+C to stop the server');