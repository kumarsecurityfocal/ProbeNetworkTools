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
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        bgcolor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
        py: 2, 
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2"
            sx={{ 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              fontSize: '0.75rem'
            }}
          >
            © {currentYear} ProbeOps
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 3 }}>
          {isAuthenticated ? (
            <>
              <Link component={RouterLink} to="/dashboard" underline="none" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.75rem' }}>
                Dashboard
              </Link>
              <Link component={RouterLink} to="/diagnostics" underline="none" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.75rem' }}>
                Diagnostics
              </Link>
              <Link component={RouterLink} to="/profile" underline="none" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.75rem' }}>
                Account
              </Link>
            </>
          ) : (
            <>
              <Link component={RouterLink} to="/login" underline="none" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.75rem' }}>
                Login
              </Link>
              <Link component={RouterLink} to="/register" underline="none" sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', fontSize: '0.75rem' }}>
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