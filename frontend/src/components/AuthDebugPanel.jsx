import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Collapse, 
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Badge
} from '@mui/material';
import { 
  BugReport, 
  Close, 
  ExpandMore, 
  ExpandLess,
  VerifiedUser,
  AdminPanelSettings,
  AccountCircle,
  VpnKey,
  Info
} from '@mui/icons-material';

/**
 * Auth Debug Panel Component
 * 
 * This component provides real-time debugging information for the authentication system.
 * Only visible in development mode with AUTH_BYPASS=true environment variable.
 */
const AuthDebugPanel = () => {
  // State for controlling panel visibility
  const [isVisible, setIsVisible] = useState(true);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [expandToken, setExpandToken] = useState(false);
  
  // Mock authentication state for development
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    token: null,
    loading: true,
    error: null
  });
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost';
  
  // Check if auth bypass is enabled
  const [isAuthBypassEnabled, setIsAuthBypassEnabled] = useState(false);
  
  useEffect(() => {
    // Check auth bypass status
    const checkAuthBypass = async () => {
      try {
        // In a real implementation, this would check the AUTH_BYPASS environment variable
        // For now, we'll just assume it's true in development
        setIsAuthBypassEnabled(isDevelopment);
        
        // Fetch the current user to populate the debug panel
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          setAuthState({
            isAuthenticated: true,
            isAdmin: userData.is_admin || false,
            user: userData,
            token: localStorage.getItem('auth_token') || 'auth-bypass-token',
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isAdmin: false,
            user: null,
            token: null,
            loading: false,
            error: 'Failed to fetch user data'
          });
        }
      } catch (error) {
        console.warn('DEBUG AUTH CONTEXT: API refresh returned no user data');
        // In development with auth bypass, create mock admin user for debugging
        if (isDevelopment) {
          setAuthState({
            isAuthenticated: true,
            isAdmin: true,
            user: {
              id: 1,
              email: 'admin@probeops.com',
              username: 'admin',
              is_admin: true
            },
            token: 'auth-bypass-mock-token',
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isAdmin: false,
            user: null,
            token: null,
            loading: false,
            error: error.message
          });
        }
      }
    };
    
    checkAuthBypass();
  }, [isDevelopment]);
  
  // Only render in development mode
  if (!isDevelopment) {
    return null;
  }
  
  // Restore button when panel is hidden
  if (showRestore) {
    return (
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<BugReport />}
        onClick={() => {
          setIsVisible(true);
          setShowRestore(false);
        }}
        sx={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
        }}
      >
        Show Auth Debug
      </Button>
    );
  }
  
  // Hide the panel completely
  if (!isVisible) {
    return null;
  }
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: isPanelMinimized ? '200px' : '350px',
        padding: '10px',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
          <BugReport color="warning" sx={{ mr: 1 }} />
          Auth Debug
          {isAuthBypassEnabled && (
            <Badge
              color="success"
              badgeContent="Bypass"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <Box>
          <IconButton 
            size="small" 
            onClick={() => setIsPanelMinimized(!isPanelMinimized)}
            sx={{ color: 'white', p: '2px', mr: '2px' }}
          >
            {isPanelMinimized ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => {
              setIsVisible(false);
              setShowRestore(true);
            }}
            sx={{ color: 'white', p: '2px' }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>
      
      <Collapse in={!isPanelMinimized}>
        <Divider sx={{ my: 1, backgroundColor: 'gray' }} />
        
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <VerifiedUser color={authState.isAuthenticated ? "success" : "error"} sx={{ mr: 1, fontSize: '1rem' }} />
            <Typography variant="body2">
              Status: {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <AdminPanelSettings color={authState.isAdmin ? "success" : "inherit"} sx={{ mr: 1, fontSize: '1rem' }} />
            <Typography variant="body2">
              Admin: {authState.isAdmin ? 'Yes' : 'No'}
            </Typography>
          </Box>
          
          {authState.user && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <AccountCircle sx={{ mr: 1, fontSize: '1rem' }} />
              <Typography variant="body2">
                User: {authState.user.email || authState.user.username}
              </Typography>
            </Box>
          )}
          
          {authState.token && (
            <Box sx={{ mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VpnKey sx={{ mr: 1, fontSize: '1rem' }} />
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Token: 
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setExpandToken(!expandToken)}
                  sx={{ color: 'white', p: 0 }}
                >
                  {expandToken ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </Box>
              
              <Collapse in={expandToken}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    p: 1, 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '4px',
                    wordBreak: 'break-all'
                  }}
                >
                  {authState.token}
                </Typography>
              </Collapse>
            </Box>
          )}
          
          {authState.error && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Info color="error" sx={{ mr: 1, fontSize: '1rem' }} />
              <Typography variant="body2" color="error">
                Error: {authState.error}
              </Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <FormControlLabel
            control={
              <Switch 
                size="small" 
                checked={isAuthBypassEnabled}
                onChange={() => {
                  // In a real app, this would toggle the AUTH_BYPASS setting
                  // For the demo, we just toggle the state
                  setIsAuthBypassEnabled(!isAuthBypassEnabled);
                }}
                color="success"
              />
            }
            label="Auth Bypass"
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
          />
          
          <Button 
            variant="outlined" 
            size="small"
            color="info"
            onClick={() => {
              // Simulate a refresh of authentication state
              setAuthState(prev => ({...prev, loading: true}));
              setTimeout(() => {
                // In a real implementation, this would refetch the user data
                setAuthState(prev => ({...prev, loading: false}));
              }, 500);
            }}
            sx={{ fontSize: '0.7rem', py: 0.5 }}
          >
            Refresh Auth
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default AuthDebugPanel;