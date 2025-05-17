// Login page specific fix
document.addEventListener('DOMContentLoaded', function() {
  // Apply only to the login page
  if (window.location.pathname === '/login' || window.location.pathname === '/app') {
    console.log('Applying login page fixes');
    
    // Safety wrapper for DOM elements and operations
    const safeDOM = {
      querySelector: function(selector) {
        try {
          return document.querySelector(selector);
        } catch (error) {
          console.warn('Safe querySelector failed:', error);
          return null;
        }
      },
      addEventListener: function(element, event, handler) {
        if (!element) return;
        try {
          element.addEventListener(event, function(e) {
            try {
              handler(e);
            } catch (error) {
              console.warn('Safe event handler failed:', error);
            }
          });
        } catch (error) {
          console.warn('Safe addEventListener failed:', error);
        }
      }
    };
    
    // Wait for login form to be available
    const loginFormCheck = setInterval(function() {
      const usernameInput = safeDOM.querySelector('input[name="username"]');
      const passwordInput = safeDOM.querySelector('input[type="password"]');
      const loginButton = safeDOM.querySelector('button[type="submit"]');
      
      if (usernameInput && passwordInput && loginButton) {
        clearInterval(loginFormCheck);
        console.log('Login form found, applying fixes');
        
        // Add direct form submission
        safeDOM.addEventListener(loginButton, 'click', function(e) {
          e.preventDefault();
          
          const username = usernameInput.value;
          const password = passwordInput.value;
          
          if (!username || !password) {
            alert('Please enter both username and password');
            return;
          }
          
          // Direct fetch to backend
          fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: username,
              password: password
            })
          })
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Login failed');
          })
          .then(data => {
            console.log('Login successful');
            // Store token in localStorage
            if (data.token) {
              localStorage.setItem('token', data.token);
            }
            // Redirect to dashboard
            window.location.href = '/dashboard';
          })
          .catch(error => {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials and try again.');
          });
        });
      }
    }, 500);
  }
});