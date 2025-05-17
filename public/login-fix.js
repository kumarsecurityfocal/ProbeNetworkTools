// Login form fix script
document.addEventListener('DOMContentLoaded', function() {
  console.log('Login fix script loaded');
  
  // Check for login form every 100ms until found
  const loginFormCheck = setInterval(() => {
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    
    if (usernameField && passwordField) {
      console.log('Login form detected, applying fixes');
      clearInterval(loginFormCheck);
      applyLoginFormFixes(usernameField, passwordField);
    }
  }, 100);
  
  function applyLoginFormFixes(usernameField, passwordField) {
    // Create a local storage for form values
    let formState = {
      username: '',
      password: ''
    };
    
    // Add event listeners directly to input elements
    usernameField.addEventListener('input', function(e) {
      formState.username = e.target.value;
      console.log('Username updated:', formState.username);
    });
    
    passwordField.addEventListener('input', function(e) {
      formState.password = e.target.value;
      console.log('Password updated:', formState.password);
    });
    
    // Add focus event listeners to ensure values persist
    usernameField.addEventListener('focus', function() {
      // When username field gets focus, set its value from our state
      setTimeout(() => {
        if (usernameField.value !== formState.username) {
          usernameField.value = formState.username;
        }
      }, 0);
    });
    
    passwordField.addEventListener('focus', function() {
      // When password field gets focus, set its value from our state
      setTimeout(() => {
        if (passwordField.value !== formState.password) {
          passwordField.value = formState.password;
        }
        
        // Also ensure username field retains its value
        if (usernameField.value !== formState.username) {
          usernameField.value = formState.username;
        }
      }, 0);
    });
    
    // Intercept form submission
    const form = usernameField.closest('form');
    if (form) {
      const originalSubmit = form.onsubmit;
      form.addEventListener('submit', function(e) {
        // Ensure both fields have correct values before submission
        usernameField.value = formState.username;
        passwordField.value = formState.password;
        
        console.log('Form submitting with:', {
          username: formState.username,
          password: formState.password ? '[REDACTED]' : ''
        });
      });
    }
    
    console.log('Login form fixes applied successfully');
  }
});