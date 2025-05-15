import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { 
  NetworkCheck as NetworkIcon,
  VpnKey as ApiKeyIcon,
  History as HistoryIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDiagnosticHistory, getApiKeys, getScheduledProbes, getDashboardMetrics } from '../services/api';

// Card styles for Airtable-inspired UI - will be modified based on dark mode
const getCardStyle = (darkMode) => ({
  borderRadius: '8px', 
  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)', 
  boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  backgroundColor: darkMode ? '#212121' : '#ffffff',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: darkMode ? '0 4px 8px rgba(0,0,0,0.3)' : '0 4px 8px rgba(0,0,0,0.05)',
    backgroundColor: darkMode ? '#252525' : '#ffffff'
  }
});

// Icon container style for Airtable-inspired UI
const iconContainerStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  mb: 2,
  backgroundColor: 'rgba(25, 118, 210, 0.08)', 
  color: '#1976d2',
  width: 'fit-content',
  p: 1,
  borderRadius: '6px'
};

// Paper style for Airtable-inspired UI - with dark mode support
const getPaperStyle = (darkMode) => ({
  p: 4, 
  borderRadius: '8px',
  boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
});

// This is a fallback in case paperStyle is accessed incorrectly somewhere
const paperStyle = {
  p: 4, 
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  border: '1px solid rgba(0,0,0,0.05)',
  backgroundColor: '#ffffff'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // Check if dark mode is enabled by looking at body background
  useEffect(() => {
    const checkDarkMode = () => {
      const bodyStyle = window.getComputedStyle(document.body);
      const bgColor = bodyStyle.backgroundColor;
      // If background is dark, enable dark mode styles
      setDarkMode(bgColor.includes('rgb(18, 18, 18)') || bgColor.includes('rgb(26, 26, 26)'));
    };
    
    checkDarkMode();
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    
    return () => observer.disconnect();
  }, []);
  const [stats, setStats] = useState({
    diagnosticCount: 0,
    apiKeyCount: 0,
    scheduledProbeCount: 0,
    successRate: 0,
    avgResponseTime: 0,
    recentDiagnostics: [],
    activeProbes: [],
  });
  const [timeRange, setTimeRange] = useState('day');
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch diagnostics history
        const diagnosticsResponse = await getDiagnosticHistory({ limit: 5 });
        const diagnostics = Array.isArray(diagnosticsResponse) ? diagnosticsResponse : [];
        
        // Fetch API keys
        const apiKeysResponse = await getApiKeys();
        const apiKeys = Array.isArray(apiKeysResponse) ? apiKeysResponse : [];
        
        // Fetch scheduled probes
        const scheduledProbesResponse = await getScheduledProbes({ active_only: true });
        const scheduledProbes = Array.isArray(scheduledProbesResponse) ? scheduledProbesResponse : [];
        
        // Since the metrics endpoint is not working, calculate metrics directly
        console.log("Calculating dashboard metrics directly");
        
        // Calculate simple metrics from the data we have
        const successfulDiagnostics = diagnostics.filter(d => d.status === 'success');
        const successRate = diagnostics.length > 0 
          ? Math.round((successfulDiagnostics.length / diagnostics.length) * 100) 
          : 0;
          
        const executionTimes = diagnostics.map(d => d.execution_time || 0);
        const avgResponseTime = executionTimes.length > 0
          ? Math.round(executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length)
          : 0;
        
        // Create metrics object with calculated values
        const dashboardMetrics = {
          diagnostic_count: diagnostics.length,
          api_key_count: apiKeys.length,
          scheduled_probe_count: scheduledProbes.length,
          success_rate: successRate,
          avg_response_time: avgResponseTime
        };
        
        console.log("Calculated dashboard metrics:", dashboardMetrics);
        
        // Update stats with all data
        setStats({
          diagnosticCount: dashboardMetrics.diagnostic_count || diagnostics.length,
          apiKeyCount: dashboardMetrics.api_key_count || apiKeys.length,
          scheduledProbeCount: dashboardMetrics.scheduled_probe_count || scheduledProbes.length,
          successRate: dashboardMetrics.success_rate || 0,
          avgResponseTime: dashboardMetrics.avg_response_time || 0,
          recentDiagnostics: diagnostics.slice(0, 5),
          activeProbes: scheduledProbes.slice(0, 3),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values on error
        setStats({
          diagnosticCount: 0,
          apiKeyCount: 0,
          scheduledProbeCount: 0,
          successRate: 0,
          avgResponseTime: 0,
          recentDiagnostics: [],
          activeProbes: [],
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [timeRange]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 0, mb: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 2,
        pb: 1,
        borderBottom: '1px solid #f0f0f5',
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            color: darkMode ? '#ffffff' : '#111827',
            fontFamily: '"Inter", sans-serif', 
            letterSpacing: '-0.01em',
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            maxWidth: { xs: '100%', sm: '60%' }
          }}
        >
          Network Monitoring Dashboard
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: darkMode ? '#333' : '#f0f4f8',
            border: '1px solid',
            borderColor: darkMode ? '#555' : '#d0d5dd',
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '40px',
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 'bold', 
              px: 2, 
              py: 1,
              backgroundColor: darkMode ? '#1976d2' : '#1976d2',
              color: 'white', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Time Range
          </Typography>
          <Select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            size="small"
            variant="standard"
            disableUnderline
            sx={{
              px: 1.5,
              height: '100%',
              '& .MuiSelect-select': {
                py: 1,
                px: 1,
                color: darkMode ? 'white' : '#333',
                fontWeight: 500,
              },
              '& .MuiSvgIcon-root': {
                color: darkMode ? 'white' : '#555',
              },
              minWidth: 120,
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: darkMode ? '#333' : 'white',
                  color: darkMode ? 'white' : '#333',
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.08)',
                    },
                    '&.Mui-selected': {
                      bgcolor: darkMode ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.12)',
                      '&:hover': {
                        bgcolor: darkMode ? 'rgba(25, 118, 210, 0.4)' : 'rgba(25, 118, 210, 0.16)',
                      },
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="hour">Last Hour</MenuItem>
            <MenuItem value="day">Last Day</MenuItem>
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
          </Select>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Stats Cards - First Row with Airtable-inspired styling */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={getCardStyle(darkMode)}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={iconContainerStyle}>
                <NetworkIcon fontSize="medium" />
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5, 
                  color: darkMode ? '#ffffff' : '#111827',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                {stats.diagnosticCount}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: darkMode ? '#b0bec5' : '#6b7280', 
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.875rem'
                }}
              >
                Network Diagnostics Run
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={getCardStyle(darkMode)}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{
                ...iconContainerStyle,
                backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)', 
                color: '#4caf50'
              }}>
                <ScheduleIcon fontSize="medium" />
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5, 
                  color: darkMode ? '#ffffff' : '#111827',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                {stats.scheduledProbeCount}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: darkMode ? '#b0bec5' : '#6b7280', 
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.875rem'
                }}
              >
                Active Scheduled Probes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={getCardStyle(darkMode)}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{
                ...iconContainerStyle,
                backgroundColor: stats.successRate > 80 
                  ? darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)'
                  : stats.successRate > 50 
                  ? darkMode ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.08)'
                  : darkMode ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.08)', 
                color: stats.successRate > 80 ? '#4caf50' : 
                      stats.successRate > 50 ? '#ff9800' : 
                      '#f44336'
              }}>
                <SuccessIcon fontSize="medium" />
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5, 
                  color: darkMode ? '#ffffff' : '#111827',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                {stats.successRate}%
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: darkMode ? '#b0bec5' : '#6b7280', 
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.875rem',
                  mb: 1
                }}
              >
                Success Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.successRate} 
                color={stats.successRate > 80 ? "success" : stats.successRate > 50 ? "warning" : "error"}
                sx={{ 
                  mt: 1, 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={getCardStyle(darkMode)}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{
                ...iconContainerStyle,
                backgroundColor: darkMode ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.08)', 
                color: '#9c27b0'
              }}>
                <TimeIcon fontSize="medium" />
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 0.5, 
                  color: darkMode ? '#ffffff' : '#111827',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                {stats.avgResponseTime}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: darkMode ? '#b0bec5' : '#6b7280', 
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.875rem'
                }}
              >
                Average Response Time (ms)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Visualizations - Second Row */}
        <Grid item xs={12} md={8}>
          <Paper sx={getPaperStyle(darkMode)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#111827',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.125rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Box sx={{ 
                  mr: 1.5, 
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  p: 1,
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <AssessmentIcon />
                </Box>
                Diagnostic Visualizations
              </Typography>

              <Chip 
                label="Last 30 days" 
                variant="outlined"
                sx={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  px: 1
                }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box 
              sx={{ 
                py: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(249, 250, 251, 0.7)',
                borderRadius: '8px',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                px: 3
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600,
                  color: darkMode ? '#ffffff' : '#111827',
                  fontFamily: '"Inter", sans-serif'
                }}
              >
                Success/Failure Ratio
              </Typography>
              
              <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: '#10b981', 
                    borderRadius: '50%', 
                    mr: 1.5 
                  }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mr: 2,
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 500,
                      color: '#374151',
                      minWidth: '60px'
                    }}
                  >
                    Success
                  </Typography>
                  <Box sx={{ flexGrow: 1, position: 'relative' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.successRate}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#10b981',
                          borderRadius: 5
                        }
                      }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      transform: 'translateX(calc(100% + 8px))',
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%'
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: '#10b981',
                          fontFamily: '"Inter", sans-serif'
                        }}
                      >
                        {stats.successRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    bgcolor: '#ef4444', 
                    borderRadius: '50%', 
                    mr: 1.5 
                  }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mr: 2,
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 500,
                      color: '#374151',
                      minWidth: '60px'
                    }}
                  >
                    Failure
                  </Typography>
                  <Box sx={{ flexGrow: 1, position: 'relative' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={100 - stats.successRate}
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#ef4444',
                          borderRadius: 5
                        }
                      }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      transform: 'translateX(calc(100% + 8px))',
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%'
                    }}>
                      <Typography 
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#ef4444',
                          fontFamily: '"Inter", sans-serif'
                        }}
                      >
                        {100 - stats.successRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              
              {/* Command Type Distribution removed */}
            </Box>
          </Paper>
        </Grid>
        
        {/* Subscription Status - Second Row */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            ...getPaperStyle(darkMode),
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={{ 
                mr: 1.5, 
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                p: 1,
                borderRadius: '8px',
                display: 'flex'
              }}>
                <ApiKeyIcon />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#111827',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.125rem'
                }}
              >
                Subscription Status
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 1,
                    fontWeight: 500,
                    color: '#6b7280',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  Current Plan
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={user?.subscription?.tier?.name || 'FREE'} 
                    sx={{
                      fontWeight: 600,
                      backgroundColor: user?.subscription?.tier?.name === 'ENTERPRISE' ? 'rgba(79, 70, 229, 0.1)' :
                                     user?.subscription?.tier?.name === 'STANDARD' ? 'rgba(14, 165, 233, 0.1)' :
                                     'rgba(168, 162, 158, 0.1)',
                      color: user?.subscription?.tier?.name === 'ENTERPRISE' ? '#4f46e5' :
                             user?.subscription?.tier?.name === 'STANDARD' ? '#0ea5e9' :
                             '#78716c',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      height: '28px'
                    }}
                    size="small"
                  />
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="body2"
                  sx={{ 
                    mb: 1,
                    fontWeight: 500,
                    color: '#6b7280',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  API Key Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={user?.subscription?.tier?.max_api_keys ? (stats.apiKeyCount / user.subscription.tier.max_api_keys) * 100 : 0}
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#4f46e5'
                        }
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    {stats.apiKeyCount} / {user?.subscription?.tier?.max_api_keys || '∞'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="body2"
                  sx={{ 
                    mb: 1,
                    fontWeight: 500,
                    color: '#6b7280',
                    fontFamily: '"Inter", sans-serif'
                  }}
                >
                  Scheduled Probes
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={user?.subscription?.tier?.max_scheduled_probes ? (stats.scheduledProbeCount / user.subscription.tier.max_scheduled_probes) * 100 : 0}
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#0ea5e9'
                        }
                      }}
                    />
                  </Box>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    {stats.scheduledProbeCount} / {user?.subscription?.tier?.max_scheduled_probes || '∞'}
                  </Typography>
                </Box>
              </Box>
              
              {user?.subscription?.expires_at && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="body2"
                    sx={{ 
                      mb: 1,
                      fontWeight: 500,
                      color: '#6b7280',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    Renews On
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: '"Inter", sans-serif'
                    }}
                  >
                    {new Date(user.subscription.expires_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
            
            {!user?.subscription?.tier?.name || user?.subscription?.tier?.name !== 'ENTERPRISE' ? (
              <Button 
                variant="contained" 
                fullWidth
                sx={{ 
                  mt: 2,
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  textTransform: 'none',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  py: 1.2,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    backgroundColor: '#4338ca'
                  }
                }}
                onClick={() => navigate('/subscriptions')}
              >
                Upgrade Plan
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                fullWidth
                sx={{ 
                  mt: 2,
                  borderColor: '#4f46e5',
                  color: '#4f46e5',
                  textTransform: 'none',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  py: 1.2,
                  '&:hover': {
                    backgroundColor: 'rgba(79, 70, 229, 0.04)',
                    borderColor: '#4f46e5'
                  }
                }}
                onClick={() => navigate('/profile')}
              >
                Manage Subscription
              </Button>
            )}
          </Paper>
        </Grid>
        
        {/* Recent Activity - Third Row */}
        <Grid item xs={12} md={6}>
          <Paper sx={getPaperStyle(darkMode)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#111827',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.125rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Box sx={{ 
                  mr: 1.5, 
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  color: '#ec4899',
                  p: 1,
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <HistoryIcon />
                </Box>
                Recent Diagnostics
              </Typography>
              
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/diagnostics')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {stats.recentDiagnostics.length > 0 ? (
              <List>
                {stats.recentDiagnostics.map((diagnostic) => (
                  <ListItem key={diagnostic.id} divider>
                    <ListItemText
                      primary={`${diagnostic.tool.toUpperCase()}: ${diagnostic.target}`}
                      secondary={`Status: ${diagnostic.status} | Time: ${new Date(diagnostic.created_at).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No diagnostics have been run yet. Start by running a diagnostic from the Diagnostics page.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Active Probes - Third Row */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...getPaperStyle(darkMode), p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: darkMode ? '#ffffff' : '#111827' }}>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Active Scheduled Probes
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/scheduled-probes')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {stats.activeProbes.length > 0 ? (
              <List>
                {stats.activeProbes.map((probe) => (
                  <ListItem key={probe.id} divider>
                    <ListItemText
                      primary={`${probe.name}: ${probe.tool.toUpperCase()} ${probe.target}`}
                      secondary={`Interval: ${probe.interval_minutes} minutes | Last Run: ${probe.updated_at ? new Date(probe.updated_at).toLocaleString() : 'Not run yet'}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No active scheduled probes. Create your first probe from the Scheduled Probes page.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Quick Actions - Fourth Row */}
        <Grid item xs={12}>
          <Paper sx={{ ...getPaperStyle(darkMode), p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: darkMode ? '#ffffff' : '#111827' }}>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth
                  startIcon={<NetworkIcon />}
                  onClick={() => navigate('/diagnostics')}
                >
                  Run Diagnostic
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth
                  startIcon={<ScheduleIcon />}
                  onClick={() => navigate('/scheduled-probes')}
                >
                  Schedule Probe
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth
                  startIcon={<ApiKeyIcon />}
                  onClick={() => navigate('/api-keys')}
                >
                  Manage API Keys
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  startIcon={<AssessmentIcon />}
                  disabled={!user?.subscription?.tier?.name || user?.subscription?.tier?.name === 'FREE'}
                  onClick={() => navigate('/profile')}
                >
                  Generate Report
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
