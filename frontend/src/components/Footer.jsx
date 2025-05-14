import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Container, Typography, Link, useTheme, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const Footer = () => {
  const { isAuthenticated, logout } = useAuth();
  const currentYear = new Date().getFullYear();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Debug output to see if user is authenticated
  console.log("Footer - isAuthenticated:", isAuthenticated);
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        borderTop: 1, 
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        bgcolor: isDarkMode ? 'rgba(26, 26, 26, 0.8)' : '#f8f9fa',
        py: 1.5, 
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography 
          variant="caption"
          sx={{ 
            color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: '0.7rem'
          }}
        >
          © {currentYear} ProbeOps
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Link component={RouterLink} to="/dashboard" underline="none" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)', 
                  fontSize: '0.7rem',
                  '&:hover': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  }
                }}>
                Dashboard
              </Link>
              <Link component={RouterLink} to="/diagnostics" underline="none" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)', 
                  fontSize: '0.7rem',
                  '&:hover': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  }
                }}>
                Diagnostics
              </Link>
              <Link component={RouterLink} to="/profile" underline="none" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)', 
                  fontSize: '0.7rem',
                  '&:hover': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  }
                }}>
                Account
              </Link>
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={logout}
                startIcon={<LogoutIcon fontSize="small" />}
                sx={{ 
                  ml: 2,
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  color: isDarkMode ? 'rgba(255, 82, 82, 0.8)' : 'rgba(211, 47, 47, 0.8)',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(211, 47, 47, 0.08)' : 'rgba(211, 47, 47, 0.04)',
                  }
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link component={RouterLink} to="/login" underline="none" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)', 
                  fontSize: '0.7rem',
                  '&:hover': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  }
                }}>
                Login
              </Link>
              <Link component={RouterLink} to="/register" underline="none" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)', 
                  fontSize: '0.7rem',
                  '&:hover': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  }
                }}>
                Register
              </Link>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;