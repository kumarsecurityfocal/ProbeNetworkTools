import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Authentication Debug Panel Component
 * 
 * Displays useful debugging information about the authentication state
 * Only appears in development mode or when auth bypass is enabled
 */
const AuthDebugPanel = () => {
  const { isAuthenticated, user, token, isAdmin, debug } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  
  // Don't render anything in production mode
  if (!debug) {
    return null;
  }

  // Styling for the debug panel
  const panelStyles = {
    position: 'fixed',
    bottom: visible ? '10px' : '-300px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#00ff00',
    padding: '10px',
    borderRadius: '5px',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: 9999,
    maxWidth: expanded ? '500px' : '250px',
    maxHeight: expanded ? '400px' : '200px',
    overflowY: 'auto',
    transition: 'all 0.3s ease-in-out',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    border: '1px solid #333'
  };
  
  const buttonStyles = {
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    padding: '3px 8px',
    borderRadius: '3px',
    marginRight: '5px',
    marginTop: '5px',
    cursor: 'pointer',
    fontSize: '11px',
  };
  
  const toggleVisibility = () => {
    setVisible(!visible);
  };
  
  // Display user information safely
  const userInfo = user ? {
    id: user.id,
    username: user.username,
    email: user.email,
    isAdmin: user.is_admin,
    created: user.created_at,
    isActive: user.is_active,
    subscription: user.subscription ? "Active" : "None"
  } : null;
  
  return (
    <>
      {!visible && (
        <button 
          onClick={toggleVisibility} 
          style={{
            ...buttonStyles,
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            zIndex: 9999,
          }}
        >
          Show Auth Debug
        </button>
      )}
      <div style={panelStyles}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '5px',
          borderBottom: '1px solid #333',
          paddingBottom: '5px'
        }}>
          <div style={{ fontWeight: 'bold' }}>🔐 Auth Debug</div>
          <div>
            <button 
              onClick={() => setExpanded(!expanded)} 
              style={buttonStyles}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
            <button 
              onClick={toggleVisibility} 
              style={buttonStyles}
            >
              Hide
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '5px' }}>
          <div>Auth: <span style={{ color: isAuthenticated ? '#0f0' : '#f00' }}>{isAuthenticated ? '✓' : '✗'}</span></div>
          <div>Admin: <span style={{ color: isAdmin ? '#0f0' : '#f00' }}>{isAdmin ? '✓' : '✗'}</span></div>
        </div>
        
        {expanded && (
          <>
            <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '5px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>User:</div>
              <pre style={{ margin: 0, fontSize: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                {userInfo ? JSON.stringify(userInfo, null, 2) : 'Not logged in'}
              </pre>
            </div>
            
            {token && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '5px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Token:</div>
                <div style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                  {`${token.substring(0, 25)}...${token.substring(token.length - 15)}`}
                </div>
              </div>
            )}
          </>
        )}
        
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
          Auth Bypass Mode Active
        </div>
      </div>
    </>
  );
};

export default AuthDebugPanel;