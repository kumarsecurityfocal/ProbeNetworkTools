// Simple app logic for the ProbeOps login page
document.addEventListener('DOMContentLoaded', function() {
  // Login form handling
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      console.log('Login attempt with username:', username);
      
      // Simulate login process
      if (username && password) {
        document.getElementById('login-message').textContent = 'Logging in...';
        
        // Simulate API call
        setTimeout(function() {
          document.getElementById('login-message').textContent = 'Login successful!';
          document.getElementById('login-message').style.color = 'green';
        }, 1000);
      } else {
        document.getElementById('login-message').textContent = 'Please enter both username and password';
        document.getElementById('login-message').style.color = 'red';
      }
    });
  }
  
  // Test API connection
  fetch('/api/test')
    .then(response => response.json())
    .then(data => {
      console.log('API response:', data);
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) {
        apiStatus.textContent = data.message;
        apiStatus.style.color = 'green';
      }
    })
    .catch(error => {
      console.error('API error:', error);
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) {
        apiStatus.textContent = 'API connection failed';
        apiStatus.style.color = 'red';
      }
    });
});