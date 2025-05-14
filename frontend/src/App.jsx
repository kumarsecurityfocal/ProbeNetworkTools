import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { lightTheme, darkTheme } from './theme/theme';

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
import LandingPage from './components/LandingPage';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = darkMode ? darkTheme : lightTheme;
  
  // Check for user's preferred color scheme
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
  }, []);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Determine if we should show the navbar and sidebar layout
  const isAppRoute = isAuthenticated && !['/login', '/register', '/'].includes(window.location.pathname);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen flex flex-col">
        {isAppRoute && <Navbar 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
          sidebarCollapsed={sidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
        />}
        
        {isAppRoute ? (
          // App layout for authenticated routes
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 1, md: 1.5 },
              pt: { xs: 0, md: 0.5 }, // Minimum top padding
              bgcolor: darkMode ? '#1a1a1a' : '#FFFFFF', // Respecting dark/light mode
              width: { 
                sm: `calc(100% - ${sidebarCollapsed ? '72px' : '240px'})` 
              },
              ml: { 
                sm: sidebarCollapsed ? '72px' : '240px' 
              },
              mt: '64px',
              transition: 'margin 0.2s ease-out, width 0.2s ease-out',
              minHeight: 'calc(100vh - 64px)', // Full height minus the app bar
              overflowY: 'auto'
            }}
          >
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/api-keys" element={<ApiTokens />} />
              <Route path="/subscriptions" element={<SubscriptionTiers />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/scheduled-probes" element={<ScheduledProbes />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        ) : (
          // Public routes without app layout - Always use light theme for auth pages
          <ThemeProvider theme={lightTheme}>
            <CssBaseline />
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/login" element={!isAuthenticated ? <AuthForm mode="login" /> : <Navigate to="/dashboard" replace />} />
                <Route path="/register" element={!isAuthenticated ? <AuthForm mode="register" /> : <Navigate to="/dashboard" replace />} />
                <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />} />
                
                {/* Catch-all for authenticated users */}
                <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
              </Routes>
            </Box>
          </ThemeProvider>
        )}
        
        {isAppRoute && <Footer />}
      </div>
    </ThemeProvider>
  );
}

export default App;