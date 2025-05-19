// Add these modifications to the handleLogin function in server.js
// Find the backendRes.on('data'...) and backendRes.on('end'...) lines

// Replace this:
backendRes.on('data', chunk => {
  responseData += chunk;
});

// With this:
backendRes.on('data', chunk => {
  console.log('🧱 RAW BACKEND CHUNK:', chunk.toString());
  responseData += chunk;
});

// And replace this:
backendRes.on('end', () => {

// With this:
backendRes.on('end', () => {
  console.log('✅ BACKEND RESPONSE COMPLETE');