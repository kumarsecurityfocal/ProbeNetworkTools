// Import our patches to fix toLowerCase errors before React loads
import './App.patch.js';
import { applyGlobalNodeFix } from './patchNodeLowerCase';

// Apply the global Node fix immediately
if (typeof window !== 'undefined') {
  applyGlobalNodeFix();
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
