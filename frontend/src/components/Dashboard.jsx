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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
        
        // Try to fetch dashboard metrics - this endpoint might not exist yet
        let dashboardMetrics = {
          diagnostic_count: diagnostics.length,
          api_key_count: apiKeys.length,
          scheduled_probe_count: scheduledProbes.length,
          success_rate: 0,
          avg_response_time: 0
        };
        
        try {
          // Try to get metrics from backend if endpoint exists
          const metricsResponse = await getDashboardMetrics();
          if (metricsResponse) {
            dashboardMetrics = {
              ...dashboardMetrics,
              ...metricsResponse
            };
          }
        } catch (metricsError) {
          // If metrics endpoint doesn't exist, calculate some basic metrics
          const successfulDiagnostics = diagnostics.filter(d => d.status === 'success');
          dashboardMetrics.success_rate = diagnostics.length > 0 
            ? Math.round((successfulDiagnostics.length / diagnostics.length) * 100) 
            : 0;
            
          const executionTimes = diagnostics.map(d => d.execution_time || 0);
          dashboardMetrics.avg_response_time = executionTimes.length > 0
            ? Math.round(executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length)
            : 0;
        }
        
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
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.username || 'User'}!
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
            size="small"
          >
            <MenuItem value="hour">Last Hour</MenuItem>
            <MenuItem value="day">Last Day</MenuItem>
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards - First Row */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="h5">{stats.diagnosticCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Network Diagnostics Run
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="h5">{stats.scheduledProbeCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active Scheduled Probes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SuccessIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="h5">{stats.successRate}%</Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.successRate} 
                color={stats.successRate > 80 ? "success" : stats.successRate > 50 ? "warning" : "error"}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimeIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="h5">{stats.avgResponseTime} ms</Typography>
              <Typography variant="body2" color="text.secondary">
                Average Response Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Visualizations - Second Row */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Diagnostic Visualizations
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ mb: 2 }}>Success/Failure Ratio</Typography>
              
              <Box sx={{ width: '100%', maxWidth: 300, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: 'success.main', borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2" sx={{ mr: 1 }}>Success</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.successRate}
                      color="success"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ ml: 1 }}>{stats.successRate}%</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: 'error.main', borderRadius: '50%', mr: 1 }} />
                  <Typography variant="body2" sx={{ mr: 1 }}>Failure</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={100 - stats.successRate}
                      color="error"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ ml: 1 }}>{100 - stats.successRate}%</Typography>
                </Box>
              </Box>
              
              <Divider sx={{ width: '100%', my: 2 }} />
              
              <Typography variant="body1" sx={{ mb: 1 }}>Command Type Distribution</Typography>
              <Typography variant="body2" color="text.secondary">
                Available in Standard and Enterprise tiers
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Subscription Status - Second Row */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Subscription Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Current Plan:</Typography>
                <Chip 
                  label={user?.subscription?.tier?.name || 'FREE'} 
                  color={
                    user?.subscription?.tier?.name === 'ENTERPRISE' ? 'primary' :
                    user?.subscription?.tier?.name === 'STANDARD' ? 'secondary' :
                    'default'
                  }
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">API Key Limit:</Typography>
                <Typography variant="body2">
                  {stats.apiKeyCount} / {user?.subscription?.tier?.max_api_keys || 'Unlimited'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Scheduled Probes Limit:</Typography>
                <Typography variant="body2">
                  {stats.scheduledProbeCount} / {user?.subscription?.tier?.max_scheduled_probes || 'Unlimited'}
                </Typography>
              </Box>
              
              {user?.subscription?.expires_at && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Renews On:</Typography>
                  <Typography variant="body2">
                    {new Date(user.subscription.expires_at).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
              
              {!user?.subscription?.tier?.name || user?.subscription?.tier?.name !== 'ENTERPRISE' ? (
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/subscriptions')}
                >
                  Upgrade Plan
                </Button>
              ) : (
                <Button 
                  variant="outlined" 
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/profile')}
                >
                  Manage Subscription
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Activity - Third Row */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
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
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
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
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
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
    </Box>
  );
};

export default Dashboard;
