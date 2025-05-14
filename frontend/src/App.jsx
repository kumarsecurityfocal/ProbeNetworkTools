import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Components
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import Diagnostics from './components/Diagnostics';
import ApiKeys from './components/ApiKeys';
import SubscriptionTiers from './components/SubscriptionTiers';
import AdminPanel from './components/AdminPanel';
import ScheduledProbes from './components/ScheduledProbes';
import UserProfile from './components/UserProfile';
import Reports from './components/Reports';
import Footer from './components/Footer';

// Create theme with modern color palette
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Modernized blue
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e', // Vibrant pink for accents
      light: '#ff5c8d',
      dark: '#a4001e',
      contrastText: '#ffffff',
    },
    accent: {
      main: '#00af87', // Teal accent for highlights
      light: '#5ce2b6',
      dark: '#007e5a',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    warning: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d',
    },
    background: {
      default: '#f5f7fa', // Slightly blueish light gray
      paper: '#ffffff',
    },
    text: {
      primary: '#172b4d', // Dark blue-gray for primary text
      secondary: '#5e6c84', // Medium blue-gray for secondary text
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.25rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.875rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.08)',
    '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 3px 8px rgba(0, 0, 0, 0.08)',
    '0px 3px 5px rgba(0, 0, 0, 0.04), 0px 5px 8px rgba(0, 0, 0, 0.08)',
    ...Array(21).fill('none'), // Fill the rest with placeholders
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.12)',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(25, 118, 210, 0.24)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 3px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08), 0px 8px 16px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Dark theme version
const darkTheme = createTheme({
  ...lightTheme,
  palette: {
    ...lightTheme.palette,
    mode: 'dark',
    primary: {
      main: '#63a4ff', // Lighter blue for dark mode
      dark: '#1976d2', 
      light: '#9ed5ff',
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#e1e5ee',
      secondary: '#a9b2c3',
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { isAuthenticated } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? darkTheme : lightTheme;
  
  // Check for user's preferred color scheme
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
  }, []);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen flex flex-col">
        <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - 240px)` },
            ml: { sm: '240px' },
            mt: '64px',
          }}
        >
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <AuthForm mode="login" /> : <Navigate to="/dashboard" replace />} />
            <Route path="/register" element={!isAuthenticated ? <AuthForm mode="register" /> : <Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/diagnostics" element={
              <ProtectedRoute>
                <Diagnostics />
              </ProtectedRoute>
            } />
            
            <Route path="/api-keys" element={
              <ProtectedRoute>
                <ApiKeys />
              </ProtectedRoute>
            } />
            
            <Route path="/subscriptions" element={
              <ProtectedRoute>
                <SubscriptionTiers />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/scheduled-probes" element={
              <ProtectedRoute>
                <ScheduledProbes />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          </Routes>
        </Box>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;