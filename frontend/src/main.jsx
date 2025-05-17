import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { applyReactDOMPatches } from './utils/reactPatches';

// Apply DOM patches to prevent errors like "toLowerCase is not a function"
// when the application deals with DOM elements
if (typeof window !== 'undefined') {
  applyReactDOMPatches();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
