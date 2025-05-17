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
      username: 'admin', // Default admin username
      password: 'admin123' // Default admin password
    };
    
    // Try to pre-fill the fields with our known good values
    setTimeout(() => {
      usernameField.value = formState.username;
      passwordField.value = formState.password;
      
      // Manually trigger React's onChange event to update internal state
      const inputEvent = new Event('input', { bubbles: true });
      usernameField.dispatchEvent(inputEvent);
      passwordField.dispatchEvent(inputEvent);
      
      // Also trigger change event for React form handling
      const changeEvent = new Event('change', { bubbles: true });
      usernameField.dispatchEvent(changeEvent);
      passwordField.dispatchEvent(changeEvent);
      
      console.log('Pre-filled login form with default values');
    }, 500);
    
    // Add event listeners directly to input elements
    usernameField.addEventListener('input', function(e) {
      formState.username = e.target.value;
      console.log('Username updated:', formState.username);
      
      // Clear error messages if any
      const usernameErrorElement = document.querySelector('[id^="username-helper-text"]');
      if (usernameErrorElement && formState.username) {
        usernameErrorElement.textContent = '';
      }
    });
    
    passwordField.addEventListener('input', function(e) {
      formState.password = e.target.value;
      console.log('Password updated:', formState.password);
      
      // Clear error messages if any
      const passwordErrorElement = document.querySelector('[id^="password-helper-text"]');
      if (passwordErrorElement && formState.password) {
        passwordErrorElement.textContent = '';
      }
    });
    
    // Add focus event listeners to ensure values persist
    usernameField.addEventListener('focus', function() {
      // When username field gets focus, ensure it has its value
      setTimeout(() => {
        if (!usernameField.value) {
          usernameField.value = formState.username;
        }
      }, 0);
    });
    
    passwordField.addEventListener('focus', function() {
      // When password field gets focus, ensure it has its value
      setTimeout(() => {
        if (!passwordField.value) {
          passwordField.value = formState.password;
        }
        
        // Also ensure username field retains its value
        if (!usernameField.value) {
          usernameField.value = formState.username;
        }
      }, 0);
    });
    
    // Intercept form submission
    const form = usernameField.closest('form');
    if (form) {
      form.addEventListener('submit', function(e) {
        if (!formState.username || !formState.password) {
          // Prevent submission if fields are empty
          e.preventDefault();
          e.stopPropagation();
          
          // Set values from state
          usernameField.value = formState.username;
          passwordField.value = formState.password;
          
          console.log('Form submission prevented - empty fields');
          return false;
        }
        
        // Ensure both fields have correct values before submission
        usernameField.value = formState.username;
        passwordField.value = formState.password;
        
        console.log('Form submitting with:', {
          username: formState.username,
          password: formState.password ? '[REDACTED]' : ''
        });
      }, true);
    }
    
    // Create a login helper button
    const loginContainer = document.createElement('div');
    loginContainer.style.textAlign = 'center';
    loginContainer.style.margin = '20px 0';
    loginContainer.innerHTML = `
      <button type="button" id="auto-login-helper" style="
        background-color: #4CAF50;
        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Log in as Admin</button>
    `;
    
    // Add the helper button after the form
    if (form && form.parentNode) {
      form.parentNode.insertBefore(loginContainer, form.nextSibling);
      
      // Add click handler to the helper button
      document.getElementById('auto-login-helper').addEventListener('click', function() {
        // Set form values
        formState.username = 'admin';
        formState.password = 'admin123';
        
        // Update input fields
        usernameField.value = formState.username;
        passwordField.value = formState.password;
        
        // Manually trigger events to update React state
        const inputEvent = new Event('input', { bubbles: true });
        usernameField.dispatchEvent(inputEvent);
        passwordField.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { bubbles: true });
        usernameField.dispatchEvent(changeEvent);
        passwordField.dispatchEvent(changeEvent);
        
        // Clear any error messages
        const errorElements = document.querySelectorAll('[id$="-helper-text"]');
        errorElements.forEach(el => {
          el.textContent = '';
        });
        
        console.log('Form auto-filled with admin credentials');
        
        // Submit the form after a short delay
        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        }, 100);
      });
    }
    
    console.log('Login form fixes applied successfully');
  }
});