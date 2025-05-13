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
  InputLabel
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
        // Ensure response is an array
        const diagnostics = Array.isArray(diagnosticsResponse) ? diagnosticsResponse : [];
        
        // Fetch API keys
        const apiKeysResponse = await getApiKeys();
        // Ensure response is an array
        const apiKeys = Array.isArray(apiKeysResponse) ? apiKeysResponse : [];
        
        setStats({
          diagnosticCount: diagnostics.length,
          apiKeyCount: apiKeys.length,
          recentDiagnostics: diagnostics.slice(0, 5),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values on error
        setStats({
          diagnosticCount: 0,
          apiKeyCount: 0,
          recentDiagnostics: [],
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.username || 'User'}!
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkIcon color="primary" className="dashboard-stat-icon" />
              </Box>
              <Typography variant="h5">{stats.diagnosticCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Network Diagnostics Run
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ApiKeyIcon color="primary" className="dashboard-stat-icon" />
              </Box>
              <Typography variant="h5">{stats.apiKeyCount}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active API Keys
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card className="dashboard-stat-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon color="primary" className="dashboard-stat-icon" />
              </Box>
              <Typography variant="h5">ProbeOps</Typography>
              <Typography variant="body2" color="text.secondary">
                Network Operations Platform
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12}>
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
        
        {/* Quick Actions */}
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
                  startIcon={<ApiKeyIcon />}
                  onClick={() => navigate('/api-keys')}
                >
                  Manage API Keys
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
