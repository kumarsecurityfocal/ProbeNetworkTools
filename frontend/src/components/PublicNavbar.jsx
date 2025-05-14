import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Button,
  MenuItem,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import LogoutIcon from '@mui/icons-material/Logout';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const PublicNavbar = ({ darkMode, toggleDarkMode }) => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, logout } = useAuth();
  
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Docs', path: '/docs' },
    { name: 'Blog', path: '/blog' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const logo = (
    <Box
      component={RouterLink}
      to="/"
      sx={{
        mr: 2,
        display: 'flex',
        alignItems: 'center',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <Logo size="md" />
    </Box>
  );

  const drawerList = (
    <Box
      sx={{ width: 280 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {logo}
        <IconButton onClick={toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {pages.map((page) => (
          <ListItem key={page.name} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={page.path}
              selected={isActive(page.path)}
            >
              <ListItemText primary={page.name} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider sx={{ my: 2 }} />
        <ListItem>
          {isAuthenticated ? (
            <ListItemButton
              onClick={logout}
              sx={{
                color: 'white',
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <ListItemText primary="Logout" />
            </ListItemButton>
          ) : (
            <ListItemButton
              component={RouterLink}
              to="/app"
              sx={{
                color: 'white',
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <ListItemText primary="Login/Sign Up" />
            </ListItemButton>
          )}
        </ListItem>
      </List>
      
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={toggleDarkMode}
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Brightness4Icon sx={{ mr: 1 }} />
              Dark Mode
            </Box>
          }
        />
      </Box>
    </Box>
  );

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: theme.palette.background.paper }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Mobile */}
          {isMobile && (
            <>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={toggleDrawer(true)}
                color="inherit"
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={toggleDrawer(false)}
              >
                {drawerList}
              </Drawer>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                {logo}
              </Box>
              <IconButton color="inherit" onClick={toggleDarkMode}>
                <Brightness4Icon />
              </IconButton>
            </>
          )}

          {/* Desktop */}
          {!isMobile && (
            <>
              {logo}
              <Box sx={{ flexGrow: 1, display: 'flex' }}>
                {pages.map((page) => (
                  <Button
                    key={page.name}
                    component={RouterLink}
                    to={page.path}
                    sx={{
                      my: 2,
                      mx: 1,
                      color: 'text.primary',
                      display: 'block',
                      borderBottom: isActive(page.path) ? `2px solid ${theme.palette.primary.main}` : 'none',
                    }}
                  >
                    {page.name}
                  </Button>
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  color="inherit" 
                  onClick={toggleDarkMode}
                  sx={{ mr: 2 }}
                  aria-label="toggle dark mode"
                >
                  <Brightness4Icon />
                </IconButton>
                {isAuthenticated ? (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={logout}
                    startIcon={<LogoutIcon />}
                  >
                    Logout
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to="/app"
                    variant="contained"
                    color="primary"
                  >
                    Login/Sign Up
                  </Button>
                )}
              </Box>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicNavbar;