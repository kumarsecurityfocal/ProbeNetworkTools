import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Link,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Code as CodeIcon,
  Dns as DnsIcon,
  Language as WebIcon,
  ArrowForward as ArrowForwardIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import Logo from './Logo';
import AuthForm from './AuthForm';
import { useAuth } from '../context/AuthContext';

// Animation keyframes for simple animation
const fadeInKeyframes = {
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
};

// Feature cards data
const features = [
  {
    title: 'Network Diagnostics',
    description: 'Run comprehensive diagnostics including ping, traceroute, DNS lookups, and HTTP checks',
    icon: <NetworkIcon fontSize="large" />,
    color: '#4285F4',
    delay: '0s',
  },
  {
    title: 'Real-time Monitoring',
    description: 'Monitor your infrastructure with scheduled probes that alert you when issues arise',
    icon: <SpeedIcon fontSize="large" />,
    color: '#0F9D58',
    delay: '0.1s',
  },
  {
    title: 'API Integration',
    description: 'Integrate network diagnostics into your workflow with our comprehensive API',
    icon: <CodeIcon fontSize="large" />,
    color: '#DB4437',
    delay: '0.2s',
  },
  {
    title: 'Scheduled Probes',
    description: 'Set up automated network checks at regular intervals to ensure reliability',
    icon: <ScheduleIcon fontSize="large" />,
    color: '#F4B400',
    delay: '0.3s',
  },
];

// Tools data
const tools = [
  {
    name: 'Ping',
    description: 'Test connectivity and response time',
    icon: <NetworkIcon />,
    color: '#4285F4',
  },
  {
    name: 'DNS Lookup',
    description: 'Resolve domain names to IP addresses',
    icon: <DnsIcon />,
    color: '#0F9D58',
  },
  {
    name: 'Traceroute',
    description: 'Visualize the path to a destination',
    icon: <StorageIcon />,
    color: '#DB4437',
  },
  {
    name: 'HTTP Check',
    description: 'Verify website availability',
    icon: <WebIcon />,
    color: '#F4B400',
  },
];

// Landing page component
const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const { isAuthenticated } = useAuth();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLoginClick = () => {
    setAuthMode('login');
    setShowAuthForm(true);
  };

  const handleSignupClick = () => {
    setAuthMode('register');
    setShowAuthForm(true);
  };

  const handleCloseAuthForm = () => {
    setShowAuthForm(false);
  };

  // If showing auth form
  if (showAuthForm) {
    return (
      <Box>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            bgcolor: 'white', 
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: 'none'
          }}
        >
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ minHeight: '64px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowAuthForm(false)}>
                <Logo size="sm" variant="color" />
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button 
                  onClick={authMode === 'login' ? handleSignupClick : handleLoginClick}
                  sx={{
                    textTransform: 'none',
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </Button>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Box sx={{ pt: 2 }}>
          <AuthForm mode={authMode} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#FCFCFD',
      overflowX: 'hidden',
      ...fadeInKeyframes,
    }}>
      {/* Navigation Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: 'none'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: '64px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Logo size="sm" variant="color" />
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              <Button 
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 500,
                  textTransform: 'none',
                  mx: 1,
                  fontSize: '0.9rem',
                }}
              >
                Features
              </Button>
              <Button 
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 500,
                  textTransform: 'none',
                  mx: 1,
                  fontSize: '0.9rem',
                }}
              >
                Pricing
              </Button>
              <Button 
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 500,
                  textTransform: 'none',
                  mx: 1,
                  fontSize: '0.9rem',
                }}
              >
                About
              </Button>
              <Button 
                onClick={handleLoginClick}
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 500,
                  textTransform: 'none',
                  mx: 1,
                  fontSize: '0.9rem',
                }}
              >
                Sign In
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSignupClick}
                sx={{ 
                  ml: 2, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  py: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                  }
                }}
              >
                Sign Up Free
              </Button>
            </Box>

            {/* Mobile Navigation */}
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSignupClick}
                sx={{ 
                  mr: 1,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  py: '6px',
                  fontSize: '0.85rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                  }
                }}
              >
                Sign Up
              </Button>
              <IconButton 
                onClick={toggleMobileMenu}
                sx={{ color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={toggleMobileMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: '280px',
            boxSizing: 'border-box',
            borderRadius: '0',
          },
        }}
      >
        <Box sx={{ width: '100%', py: 2, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, px: 1 }}>
            <Logo size="sm" variant="color" />
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem button onClick={toggleMobileMenu}>
              <ListItemText primary="Features" />
            </ListItem>
            <ListItem button onClick={toggleMobileMenu}>
              <ListItemText primary="Pricing" />
            </ListItem>
            <ListItem button onClick={toggleMobileMenu}>
              <ListItemText primary="About" />
            </ListItem>
            <ListItem button onClick={() => { toggleMobileMenu(); handleLoginClick(); }}>
              <ListItemText primary="Sign In" />
            </ListItem>
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Button 
            fullWidth 
            variant="contained" 
            color="primary"
            onClick={() => { toggleMobileMenu(); handleSignupClick(); }}
            sx={{ 
              textTransform: 'none',
              fontWeight: 500,
              py: 1.5,
              borderRadius: '8px'
            }}
          >
            Sign Up Free
          </Button>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box 
        sx={{ 
          pt: { xs: 6, md: 8 },
          pb: { xs: 4, md: 6 },
          bgcolor: '#fcfeff',
          backgroundImage: 'radial-gradient(circle at 25% 100%, rgba(66, 133, 244, 0.05) 0%, rgba(255, 255, 255, 0) 50%), radial-gradient(circle at 80% 20%, rgba(15, 157, 88, 0.05) 0%, rgba(255, 255, 255, 0) 50%)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} sx={{ 
              animation: 'fadeIn 0.8s ease-out forwards',
              animationDelay: '0.1s',
              opacity: 0
            }}>
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 800, 
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  lineHeight: 1.2,
                  mb: 2,
                  color: '#202124',
                  fontFamily: '"Inter", sans-serif',
                  letterSpacing: '-0.02em'
                }}
              >
                Comprehensive <Box component="span" sx={{ color: '#2196F3' }}>Network</Box> Diagnostics Platform
              </Typography>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  fontWeight: 400,
                  color: '#5f6368',
                  lineHeight: 1.5,
                  mb: 3
                }}
              >
                Monitor, diagnose, and troubleshoot your network infrastructure with powerful tools and real-time insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  size="medium"
                  onClick={handleSignupClick}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1,
                    px: 3,
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 8px rgba(33, 150, 243, 0.25)'
                  }}
                >
                  Get Started Free
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  size="medium"
                  sx={{ 
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontWeight: 500,
                    py: 1,
                    px: 3,
                    fontSize: '0.9rem',
                    borderColor: 'rgba(33, 150, 243, 0.5)',
                    '&:hover': {
                      borderColor: '#2196F3',
                      bgcolor: 'rgba(33, 150, 243, 0.04)'
                    }
                  }}
                >
                  Learn More
                </Button>
              </Box>
              <Box sx={{ mt: 4, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  No credit card required • Free tier available
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              animation: 'fadeIn 0.8s ease-out forwards',
              animationDelay: '0.3s',
              opacity: 0
            }}>
              <Box 
                sx={{ 
                  width: '100%', 
                  maxWidth: '400px', 
                  height: '280px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.07)',
                }}
              >
                <Box 
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(66, 133, 244, 0.03)',
                    backgroundImage: `
                      radial-gradient(circle at 10% 20%, rgba(66, 133, 244, 0.15) 0%, rgba(255, 255, 255, 0) 30%),
                      radial-gradient(circle at 90% 80%, rgba(15, 157, 88, 0.1) 0%, rgba(255, 255, 255, 0) 30%),
                      radial-gradient(circle at 60% 30%, rgba(219, 68, 55, 0.1) 0%, rgba(255, 255, 255, 0) 40%),
                      radial-gradient(circle at 30% 70%, rgba(244, 180, 0, 0.1) 0%, rgba(255, 255, 255, 0) 30%)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }}
                >
                  {/* Network visualization with animated nodes */}
                  <Box sx={{ position: 'relative', width: '300px', height: '300px' }}>
                    <Logo size="2xl" variant="color" />
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        textAlign: 'center',
                        mt: 3,
                        fontWeight: 600,
                        color: '#202124'
                      }}
                    >
                      Network Monitoring Dashboard
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        textAlign: 'center',
                        mt: 1,
                        color: '#5f6368'
                      }}
                    >
                      Real-time diagnostics and analytics
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                fontSize: { xs: '2rem', md: '2.5rem' },
                mb: 2,
                color: '#202124'
              }}
            >
              Powerful Features for Network Management
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: '#5f6368',
                maxWidth: '800px',
                mx: 'auto'
              }}
            >
              ProbeOps provides a comprehensive suite of tools for network monitoring, diagnostics and troubleshooting
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index} sx={{ 
                animation: 'fadeIn 0.6s ease-out forwards',
                animationDelay: feature.delay,
                opacity: 0
              }}>
                <Card sx={{ 
                  borderRadius: '16px', 
                  height: '100%', 
                  boxShadow: '0px 5px 20px rgba(0, 0, 0, 0.08)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.12)',
                  }
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box 
                      sx={{ 
                        width: 60, 
                        height: 60, 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 2,
                        bgcolor: `${feature.color}10`,
                        color: feature.color,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 1.5,
                        color: '#202124'
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#5f6368', mb: 2 }}>
                      {feature.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                      <Link 
                        component="button"
                        underline="none" 
                        sx={{ 
                          color: feature.color, 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.9rem',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        Learn more
                        <ArrowRightIcon fontSize="small" sx={{ ml: 0.5 }} />
                      </Link>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Tools Section */}
      <Box 
        sx={{ 
          py: { xs: 6, md: 10 }, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={5} sx={{ 
              animation: 'fadeIn 0.8s ease-out forwards',
              opacity: 0
            }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 2,
                  color: '#202124'
                }}
              >
                Network Diagnostic Tools
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  color: '#5f6368',
                  mb: 4
                }}
              >
                ProbeOps offers a complete set of tools to diagnose and troubleshoot network issues quickly and efficiently.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSignupClick}
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  py: 1.5,
                  px: 4
                }}
              >
                Try All Tools
              </Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={3}>
                {tools.map((tool, index) => (
                  <Grid item xs={12} sm={6} key={index} sx={{ 
                    animation: 'fadeIn 0.6s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 3, 
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          mb: 2,
                          bgcolor: `${tool.color}10`,
                          color: tool.color
                        }}
                      >
                        {tool.icon}
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600, 
                          mb: 1,
                          color: '#202124'
                        }}
                      >
                        {tool.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#5f6368' }}>
                        {tool.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
        <Container maxWidth="md">
          <Box 
            sx={{ 
              textAlign: 'center',
              p: { xs: 4, md: 6 },
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #f5f9ff 0%, #eef4ff 100%)',
              border: '1px solid rgba(66, 133, 244, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative elements */}
            <Box 
              sx={{ 
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(66, 133, 244, 0.1) 0%, rgba(255, 255, 255, 0) 70%)',
              }}
            />
            <Box 
              sx={{ 
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(15, 157, 88, 0.1) 0%, rgba(255, 255, 255, 0) 70%)',
              }}
            />
            
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                mb: 2,
                color: '#202124',
                position: 'relative',
                zIndex: 1
              }}
            >
              Ready to optimize your network operations?
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: '#5f6368',
                mb: 4,
                maxWidth: '600px',
                mx: 'auto',
                position: 'relative',
                zIndex: 1
              }}
            >
              Join thousands of IT professionals using ProbeOps to monitor, diagnose, and optimize their network infrastructure.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              color="primary"
              onClick={handleSignupClick}
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                px: 4,
                fontSize: '1rem',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.25)',
                position: 'relative',
                zIndex: 1
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box 
        sx={{ 
          py: 5, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Logo size="sm" variant="color" />
                <Typography 
                  variant="h6" 
                  sx={{ 
                    ml: 1.5, 
                    fontWeight: 600, 
                    fontSize: '1.1rem',
                    color: 'text.primary'
                  }}
                >
                  ProbeOps
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#5f6368', mb: 2 }}>
                Comprehensive network diagnostics and monitoring platform for IT professionals.
              </Typography>
              <Typography variant="body2" sx={{ color: '#5f6368' }}>
                © {new Date().getFullYear()} ProbeOps. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Product</Typography>
              <List disablePadding>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Features
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Pricing
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Documentation
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    API
                  </Link>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Company</Typography>
              <List disablePadding>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    About
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Careers
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Blog
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Contact
                  </Link>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Resources</Typography>
              <List disablePadding>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Help Center
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Community
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Status
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Videos
                  </Link>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Legal</Typography>
              <List disablePadding>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Terms
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Privacy
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Cookies
                  </Link>
                </ListItem>
                <ListItem disableGutters sx={{ py: 0.5 }}>
                  <Link component="button" underline="none" sx={{ color: '#5f6368', '&:hover': { color: 'primary.main' } }}>
                    Licenses
                  </Link>
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;