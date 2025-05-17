import React, { useState, useEffect } from 'react';
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
  Switch,
  Badge,
  Container,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  NetworkCheck as DiagnosticsIcon,
  VpnKey as ApiKeyIcon,
  CardMembership as SubscriptionIcon,
  AdminPanelSettings as AdminIcon,
  Schedule as ScheduleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Assessment as ReportIcon,
  Brightness4 as DarkModeIcon, // Changed to a more neutral icon
  LightMode as LightModeIcon,
  NotificationsNone as NotificationsIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  Settings as SettingsIcon,
  SettingsRemote as ProbeManagementIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 72;

const Navbar = ({ darkMode, toggleDarkMode, sidebarCollapsed, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const drawerWidth = sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded;
  
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      toggleSidebar();
    }
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
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
    { name: 'Diagnostics', path: '/diagnostics', icon: <DiagnosticsIcon fontSize="small" /> },
    { name: 'Scheduled Probes', path: '/scheduled-probes', icon: <ScheduleIcon fontSize="small" /> },
    { name: 'Reports', path: '/reports', icon: <ReportIcon fontSize="small" /> },
    { name: 'API Tokens', path: '/api-keys', icon: <ApiKeyIcon fontSize="small" /> },
    { name: 'Subscriptions', path: '/subscriptions', icon: <SubscriptionIcon fontSize="small" /> },
  ];
  
  // Admin-only navigation items
  const adminNavItems = [
    { name: 'Admin Panel', path: '/admin', icon: <AdminIcon fontSize="small" /> },
    { name: 'Probe Management', path: '/probe-management', icon: <ProbeManagementIcon fontSize="small" /> },
    { name: 'Troubleshooting', path: '/troubleshooting', icon: <HelpIcon fontSize="small" /> },
    { name: 'Database Admin', path: '/database', icon: <SettingsIcon fontSize="small" /> },
  ];
  
  // Combine navigation items based on user role
  const navItems = user?.is_admin
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;
  
  // Airtable-style sidebar
  const drawer = (
    <Box sx={{ height: '100%', bgcolor: darkMode ? '#242424' : '#ffffff', overflowY: 'auto', overflowX: 'hidden' }}>
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          p: sidebarCollapsed ? 1 : 3
        }}
      >
        {/* Logo and ProbeOps text removed as requested */}
      </Box>
      {/* Divider removed as requested */}
      <List sx={{ 
        px: sidebarCollapsed ? 0.5 : 1, 
        py: 2,
        mt: 1 // Add margin top to create spacing after removing the divider
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip
              title={sidebarCollapsed ? item.name : ""}
              placement="right"
              key={item.name}
            >
              <ListItem 
                button 
                component={RouterLink}
                to={item.path}
                selected={isActive}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  px: sidebarCollapsed ? 1 : 2,
                  color: isActive 
                    ? darkMode ? '#90caf9' : '#2563EB' 
                    : darkMode ? '#e0e0e0' : '#4B5563',
                  bgcolor: isActive 
                    ? darkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(37, 99, 235, 0.08)' 
                    : 'transparent',
                  '&:hover': {
                    bgcolor: darkMode 
                      ? 'rgba(144, 202, 249, 0.04)' 
                      : 'rgba(37, 99, 235, 0.04)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive 
                      ? darkMode ? '#90caf9' : '#2563EB' 
                      : darkMode ? '#b0bec5' : '#6B7280',
                    minWidth: sidebarCollapsed ? '30px' : '40px',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }
                }}
              >
                <ListItemIcon>
                  {React.cloneElement(item.icon, { 
                    style: { 
                      color: isActive 
                        ? darkMode ? '#90caf9' : '#2563EB' 
                        : darkMode ? '#b0bec5' : '#6B7280' 
                    } 
                  })}
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <ListItemText 
                    primary={item.name} 
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.95rem'
                    }}
                  />
                )}
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
      
      <Divider sx={{ my: 1, mx: sidebarCollapsed ? 1 : 2 }} />
      
      {sidebarCollapsed ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"} placement="right">
            <IconButton 
              onClick={toggleDarkMode}
              size="small"
              sx={{ 
                color: darkMode ? '#DADCE0' : '#6B7280',
              }}
            >
              {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
            {darkMode ? 'Dark Mode' : 'Light Mode'}
          </Typography>
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            color="primary"
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#2563EB',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#2563EB',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
  
  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: darkMode ? '0 1px 3px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)', 
          borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #DADCE0',
          backgroundColor: darkMode ? '#242424' : '#ffffff',
          color: darkMode ? '#ffffff' : '#202124'
        }}
      >
        <Toolbar sx={{ px: { xs: 1, md: 2 } }}>
          {isAuthenticated && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 1, 
                display: 'flex',
                color: darkMode ? '#ffffff' : '#6B7280' 
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mr: 3 
            }}
          >
            <RouterLink 
              to={isAuthenticated ? "/dashboard" : "/"} 
              style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center' 
              }}
            >
              <Logo 
                variant={darkMode ? "light" : "color"} 
                size="sm" 
              />
            </RouterLink>
          </Box>
          
          {isAuthenticated ? (
            <>
              <Box sx={{ flexGrow: 1 }}></Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {/* Search */}
                <Tooltip title="Search">
                  <IconButton
                    size="large"
                    color="inherit"
                    sx={{ 
                      ml: { xs: 0.5, md: 1 },
                      color: darkMode ? '#DADCE0' : 'gray.700' 
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                
                {/* Help */}
                <Tooltip title="Help">
                  <IconButton
                    size="large"
                    color="inherit"
                    sx={{ 
                      ml: { xs: 0.5, md: 1 },
                      color: darkMode ? '#DADCE0' : 'gray.700' 
                    }}
                  >
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
                
                {/* Notifications */}
                <Tooltip title="Notifications">
                  <IconButton
                    size="large"
                    color="inherit"
                    sx={{ 
                      ml: { xs: 0.5, md: 1 },
                      color: darkMode ? '#DADCE0' : 'gray.700' 
                    }}
                  >
                    <Badge badgeContent={0} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                {/* Dark/Light Mode Toggle */}
                <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
                  <IconButton
                    onClick={toggleDarkMode}
                    size="large"
                    color="inherit"
                    sx={{ 
                      ml: { xs: 0.5, md: 1 },
                      mr: { xs: 1, md: 2 },
                      color: darkMode ? '#DADCE0' : 'gray.700' 
                    }}
                  >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
                
                {/* User profile */}
                <Tooltip title={user?.username || 'User'}>
                  <IconButton
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                    sx={{ p: 0.5 }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36,
                        bgcolor: user?.is_admin ? '#DB4437' : '#4285F4',
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 500,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
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
                    elevation: 2,
                    sx: {
                      mt: 1,
                      borderRadius: '12px',
                      border: '1px solid #DADCE0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      minWidth: '220px',
                      overflow: 'visible',
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 18,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                        borderTop: '1px solid #DADCE0',
                        borderLeft: '1px solid #DADCE0',
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #DADCE0' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {user?.username || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email || ''}
                    </Typography>
                  </Box>
                  
                  <MenuItem 
                    component={RouterLink} 
                    to="/profile" 
                    onClick={handleMenuClose}
                    sx={{ 
                      py: 1.5, 
                      '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.04)' } 
                    }}
                  >
                    <ListItemIcon>
                      <PersonIcon fontSize="small" sx={{ color: '#4285F4' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Profile" 
                      primaryTypographyProps={{ fontSize: '0.95rem' }}
                    />
                  </MenuItem>
                  
                  <MenuItem 
                    component={RouterLink}
                    to="/settings"
                    onClick={handleMenuClose}
                    sx={{ 
                      py: 1.5, 
                      '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.04)' } 
                    }}
                  >
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" sx={{ color: '#5f6368' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Settings" 
                      primaryTypographyProps={{ fontSize: '0.95rem' }}
                    />
                  </MenuItem>
                  
                  <Divider />
                  
                  <MenuItem 
                    onClick={handleLogout}
                    sx={{ 
                      py: 1.5, 
                      '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.04)' } 
                    }}
                  >
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: '#5f6368' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Logout" 
                      primaryTypographyProps={{ fontSize: '0.95rem' }}
                    />
                  </MenuItem>
                </Menu>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
              <Button 
                color="primary" 
                component={RouterLink}
                to="/login"
                variant="outlined"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  mr: 1,
                  border: '1px solid #DADCE0',
                  color: '#4285F4',
                  '&:hover': {
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.04)'
                  }
                }}
              >
                Sign in
              </Button>
              <Button 
                color="primary" 
                component={RouterLink}
                to="/register"
                variant="contained"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  backgroundColor: '#4285F4',
                  '&:hover': {
                    backgroundColor: '#3367d6'
                  }
                }}
              >
                Sign up
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {isAuthenticated && (
        <Box 
          component="nav" 
          sx={{ 
            width: { sm: drawerWidth }, 
            flexShrink: { sm: 0 },
            transition: 'width 0.2s ease-out',
          }}
        >
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
                width: drawerWidthExpanded,
                borderRight: '1px solid #DADCE0',
                bgcolor: '#ffffff',
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
                borderRight: '1px solid #DADCE0',
                bgcolor: '#ffffff',
                transition: 'width 0.2s ease-out',
                overflowX: 'hidden',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}
      
      {/* Main content wrapper with proper spacing */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // To account for fixed AppBar height
          ml: isAuthenticated ? { sm: `${drawerWidth}px` } : 0,
          width: isAuthenticated 
            ? { sm: `calc(100% - ${drawerWidth}px)` } 
            : '100%',
        }}
      >
        {/* Content will go here */}
      </Box>
    </>
  );
};

export default Navbar;