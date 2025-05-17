import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { lightTheme, darkTheme } from './theme/theme';

// App Components
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import Diagnostics from './components/Diagnostics';
import ApiTokens from './components/ApiTokens';
import SubscriptionTiers from './components/SubscriptionTiers';
import AdminPanel from './components/AdminPanel';
import ScheduledProbes from './components/ScheduledProbes';
import UserProfile from './components/UserProfile';
import Reports from './components/Reports';
import Footer from './components/Footer';
import TroubleshootingPanel from './components/TroubleshootingPanel';
import DatabaseAdminPanel from './components/DatabaseAdminPanel';
import ProbeManagement from './components/ProbeManagement';

// Direct Access Pages
import DatabasePage from './pages/DatabasePage';

// Public Site Components
import PublicLayout from './components/PublicLayout';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Docs from './pages/Docs';
import About from './pages/About';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import DashboardLink from './pages/DashboardLink';

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
  const { isAuthenticated, loading } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = darkMode ? darkTheme : lightTheme;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for user's preferred color scheme
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);
  }, []);
  
  // Handle redirection based on authentication state
  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;
    
    const path = location.pathname;
    const publicRoutes = ['/', '/pricing', '/docs', '/blog', '/about', '/contact', '/login', '/register', '/app', '/app/login', '/app/register'];
    
    // If authenticated and on a public route (except landing and informational pages), redirect to dashboard
    if (isAuthenticated && (path === '/login' || path === '/register' || path === '/app' || path === '/app/login' || path === '/app/register')) {
      navigate('/dashboard', { replace: true });
    }
    
    // If on root path and authenticated, go to dashboard
    if (isAuthenticated && path === '/') {
      navigate('/dashboard', { replace: true });
    }
    
    // If not authenticated and on a protected route that's not in public routes
    if (!isAuthenticated && !publicRoutes.includes(path)) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Determine if we should show the navbar and sidebar layout
  // If authenticated, treat all routes except explicitly public ones as app routes
  const publicRoutes = ['/', '/pricing', '/docs', '/blog', '/about', '/contact', '/login', '/register', '/app', '/app/login', '/app/register'];
  const isAppRoute = isAuthenticated && !publicRoutes.includes(window.location.pathname);
  
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
              <Route path="/troubleshooting" element={<TroubleshootingPanel />} />
              <Route path="/database" element={<DatabaseAdminPanel />} />
              <Route path="/probe-management" element={<ProbeManagement />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        ) : (
          // Public routes with public layout
          <Routes>
            {/* Authentication Routes - Always use light theme */}
            <Route path="/app" element={
              <ThemeProvider theme={lightTheme}>
                <CssBaseline />
                <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
                  {!isAuthenticated ? <AuthForm mode="login" /> : <Navigate to="/dashboard" replace />}
                </Box>
              </ThemeProvider>
            } />
            <Route path="/app/login" element={
              <ThemeProvider theme={lightTheme}>
                <CssBaseline />
                <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
                  {!isAuthenticated ? <AuthForm mode="login" /> : <Navigate to="/dashboard" replace />}
                </Box>
              </ThemeProvider>
            } />
            <Route path="/app/register" element={
              <ThemeProvider theme={lightTheme}>
                <CssBaseline />
                <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
                  {!isAuthenticated ? <AuthForm mode="register" /> : <Navigate to="/dashboard" replace />}
                </Box>
              </ThemeProvider>
            } />
            <Route path="/login" element={
              <ThemeProvider theme={lightTheme}>
                <CssBaseline />
                <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
                  {!isAuthenticated ? <AuthForm mode="login" /> : <Navigate to="/dashboard" replace />}
                </Box>
              </ThemeProvider>
            } />
            <Route path="/register" element={
              <ThemeProvider theme={lightTheme}>
                <CssBaseline />
                <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
                  {!isAuthenticated ? <AuthForm mode="register" /> : <Navigate to="/dashboard" replace />}
                </Box>
              </ThemeProvider>
            } />

            {/* Public Website */}
            <Route element={<PublicLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
              {/* Landing page with auth check - go to dashboard if authenticated */}
              <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
              
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/dashboard" element={!isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/dashboard" replace />} />
              
              {/* Catch-all redirect to dashboard if authenticated, otherwise to home */}
              <Route path="*" element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
              } />
            </Route>
          </Routes>
        )}
        
        {isAppRoute && <Footer />}
      </div>
    </ThemeProvider>
  );
}

export default App;