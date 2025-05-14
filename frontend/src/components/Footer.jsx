import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Container, Typography, Link, useTheme } from '@mui/material';

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
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
        
        <Box sx={{ display: 'flex', gap: 2 }}>
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
          )
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;