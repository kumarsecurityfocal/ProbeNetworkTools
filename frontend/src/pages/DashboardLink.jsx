import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  useTheme
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';

const DashboardLink = () => {
  const theme = useTheme();

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary,
      py: 8,
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center'
    }}>
      <Container maxWidth="md">
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 2,
            boxShadow: 3
          }}
        >
          <DashboardIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          
          <Typography variant="h3" component="h1" gutterBottom>
            Access Your Dashboard
          </Typography>
          
          <Typography variant="h6" color="text.secondary" paragraph>
            Already a user? Log in to access your ProbeOps dashboard.
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <Button
              component={Link}
              to="/app"
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              sx={{ mr: 2 }}
            >
              Log In
            </Button>
            
            <Button
              component={Link}
              to="/app/register"
              variant="outlined"
              size="large"
            >
              Sign Up
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Need help? Contact our <Link to="/contact" style={{ color: theme.palette.primary.main }}>support team</Link>.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default DashboardLink;