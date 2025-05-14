import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Avatar,
  Tooltip,
  Switch
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  NetworkCheck as DiagnosticsIcon,
  VpnKey as ApiKeyIcon,
  CardMembership as SubscriptionIcon,
  AdminPanelSettings as AdminIcon,
  Schedule as ScheduleIcon,
  Logout,
  Person as PersonIcon,
  Assessment as ReportIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const drawerWidth = 240;

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };
  
  // Base navigation items for all users
  const baseNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon className="text-primary-500" /> },
    { name: 'Diagnostics', path: '/diagnostics', icon: <DiagnosticsIcon className="text-primary-500" /> },
    { name: 'Scheduled Probes', path: '/scheduled-probes', icon: <ScheduleIcon className="text-primary-500" /> },
    { name: 'Reports', path: '/reports', icon: <ReportIcon className="text-primary-500" /> },
    { name: 'API Keys', path: '/api-keys', icon: <ApiKeyIcon className="text-primary-500" /> },
    { name: 'Subscriptions', path: '/subscriptions', icon: <SubscriptionIcon className="text-primary-500" /> },
  ];
  
  // Admin-only navigation items
  const adminNavItems = [
    { name: 'Admin Panel', path: '/admin', icon: <AdminIcon className="text-secondary-500" /> },
  ];
  
  // Combine navigation items based on user role
  const navItems = user?.is_admin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;
  
  const drawer = (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 3
        }}
      >
        <Logo size="md" />
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mt: 2 }}>
          ProbeOps
        </Typography>
      </Box>
      <Divider />
      <List className="py-4">
        {navItems.map((item) => (
          <ListItem
            button
            key={item.name}
            component={RouterLink}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''} my-1 mx-2`}
          >
            <ListItemIcon className="min-w-[40px]">{item.icon}</ListItemIcon>
            <ListItemText 
              primary={
                <span className="font-medium text-sm">{item.name}</span>
              } 
            />
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <Box className="flex items-center justify-between px-4 py-3">
        <Typography variant="body2" className="text-gray-600">
          {darkMode ? 'Dark Mode' : 'Light Mode'}
        </Typography>
        <Switch
          checked={darkMode}
          onChange={toggleDarkMode}
          color="primary"
          icon={<LightModeIcon fontSize="small" />}
          checkedIcon={<DarkModeIcon fontSize="small" />}
        />
      </Box>
    </Box>
  );
  
  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
          backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
          color: darkMode ? '#ffffff' : '#172b4d'
        }}
      >
        <Toolbar>
          {isAuthenticated && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}
          >
            <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box className="flex items-center gap-2">
                <Logo size="sm" color={darkMode ? "white" : "primary"} />
                <span className="font-bold">ProbeOps</span>
              </Box>
            </RouterLink>
          </Typography>
          
          {isAuthenticated ? (
            <>
              <Box className="hidden md:flex space-x-1">
                {navItems.map((item) => (
                  <Button
                    key={item.name}
                    color="inherit"
                    component={RouterLink}
                    to={item.path}
                    className={
                      location.pathname === item.path 
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-300' 
                        : ''
                    }
                    sx={{ 
                      mx: 0.5,
                      px: 2,
                      py: 1,
                      textTransform: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 500
                    }}
                  >
                    {item.name}
                  </Button>
                ))}
              </Box>
              
              <Tooltip title="Account settings">
                <IconButton
                  edge="end"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                  className="ml-2"
                >
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    minWidth: '200px'
                  }
                }}
              >
                <Box className="px-4 py-3">
                  <Typography variant="subtitle1" className="font-semibold">{user?.username || 'User'}</Typography>
                  <Typography variant="body2" className="text-gray-500">{user?.email || ''}</Typography>
                </Box>
                <Divider />
                <MenuItem 
                  component={RouterLink} 
                  to="/profile" 
                  onClick={handleMenuClose}
                  className="py-2"
                >
                  <ListItemIcon>
                    <PersonIcon fontSize="small" className="text-primary-500" />
                  </ListItemIcon>
                  <ListItemText primary="My Profile" />
                </MenuItem>
                <MenuItem 
                  onClick={handleLogout}
                  className="py-2"
                >
                  <ListItemIcon>
                    <Logout fontSize="small" className="text-red-500" />
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box className="flex items-center space-x-2">
              <Button
                color="primary"
                component={RouterLink}
                to="/login"
                variant="text"
                className="font-medium"
              >
                Login
              </Button>
              <Button
                color="primary"
                component={RouterLink}
                to="/register"
                variant="contained"
                className="shadow-sm"
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {isAuthenticated && (
        <Box component="nav">
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth 
              },
            }}
          >
            {drawer}
          </Drawer>
          
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                marginTop: '64px',
                borderRight: '1px solid rgba(0, 0, 0, 0.08)'
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}
    </>
  );
};

export default Navbar;