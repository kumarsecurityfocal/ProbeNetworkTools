import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Switch, 
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useApi } from '../hooks/useApi';

const TroubleshootingPanel = () => {
  const { api } = useApi();
  const [systemLogs, setSystemLogs] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState('');
  const [authConfig, setAuthConfig] = useState('');
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dbStatusLoading, setDbStatusLoading] = useState(false);
  const [authConfigLoading, setAuthConfigLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: 'info', message: 'Ready to collect troubleshooting information' });

  // Function to fetch system logs
  const fetchSystemLogs = async () => {
    setLogsLoading(true);
    setStatusMessage({ type: 'info', message: 'Collecting system logs...' });
    try {
      const response = await api.get('/api/admin/system-logs');
      setSystemLogs(response.data.logs);
      setStatusMessage({ type: 'success', message: 'System logs collected successfully' });
    } catch (error) {
      console.error('Error fetching system logs:', error);
      setSystemLogs('Error fetching system logs: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to collect system logs' });
    } finally {
      setLogsLoading(false);
    }
  };

  // Function to check database connectivity
  const checkDatabaseStatus = async () => {
    setDbStatusLoading(true);
    setStatusMessage({ type: 'info', message: 'Checking database connectivity...' });
    try {
      const response = await api.get('/api/admin/db-status');
      setDatabaseStatus(JSON.stringify(response.data, null, 2));
      setStatusMessage({ type: 'success', message: 'Database status checked successfully' });
    } catch (error) {
      console.error('Error checking database status:', error);
      setDatabaseStatus('Error checking database status: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to check database status' });
    } finally {
      setDbStatusLoading(false);
    }
  };

  // Function to check auth configuration
  const checkAuthConfig = async () => {
    setAuthConfigLoading(true);
    setStatusMessage({ type: 'info', message: 'Checking authentication configuration...' });
    try {
      const response = await api.get('/api/admin/auth-config');
      setAuthConfig(JSON.stringify(response.data, null, 2));
      setStatusMessage({ type: 'success', message: 'Authentication configuration checked successfully' });
    } catch (error) {
      console.error('Error checking auth config:', error);
      setAuthConfig('Error checking auth config: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to check authentication configuration' });
    } finally {
      setAuthConfigLoading(false);
    }
  };

  // Function to toggle debug mode
  const toggleDebugMode = async () => {
    try {
      setStatusMessage({ type: 'info', message: 'Toggling debug mode...' });
      const response = await api.post('/api/admin/toggle-debug', { enabled: !debugEnabled });
      setDebugEnabled(response.data.debug_enabled);
      setStatusMessage({ 
        type: 'success', 
        message: `Debug mode ${response.data.debug_enabled ? 'enabled' : 'disabled'} successfully` 
      });
    } catch (error) {
      console.error('Error toggling debug mode:', error);
      setStatusMessage({ type: 'error', message: 'Failed to toggle debug mode' });
    }
  };

  // Function to generate a download link for logs
  const downloadLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([systemLogs], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `probeops-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Check current debug status on component mount
  useEffect(() => {
    const checkDebugStatus = async () => {
      try {
        const response = await api.get('/api/admin/debug-status');
        setDebugEnabled(response.data.debug_enabled);
      } catch (error) {
        console.error('Error checking debug status:', error);
      }
    };
    
    checkDebugStatus();
  }, [api]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Troubleshooting
      </Typography>
      
      <Alert severity={statusMessage.type} sx={{ mb: 3 }}>
        {statusMessage.message}
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={debugEnabled}
                  onChange={toggleDebugMode}
                  name="debugMode"
                  color="primary"
                />
              }
              label="Enable Debug Mode"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              {debugEnabled ? 'Debug logging is enabled (more verbose logs)' : 'Debug logging is disabled (standard logs)'}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>System Logs</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={fetchSystemLogs}
                  startIcon={logsLoading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  disabled={logsLoading}
                >
                  Collect Logs
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<DownloadIcon />} 
                  onClick={downloadLogs}
                  disabled={!systemLogs}
                >
                  Download Logs
                </Button>
              </Box>
              <TextField
                multiline
                fullWidth
                rows={15}
                value={systemLogs}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
                placeholder="System logs will appear here..."
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Database Status</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={checkDatabaseStatus}
                  startIcon={dbStatusLoading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  disabled={dbStatusLoading}
                >
                  Check Database Connection
                </Button>
              </Box>
              <TextField
                multiline
                fullWidth
                rows={8}
                value={databaseStatus}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
                placeholder="Database status information will appear here..."
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Authentication Configuration</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={checkAuthConfig}
                  startIcon={authConfigLoading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  disabled={authConfigLoading}
                >
                  Check Authentication Config
                </Button>
              </Box>
              <TextField
                multiline
                fullWidth
                rows={8}
                value={authConfig}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
                placeholder="Authentication configuration information will appear here..."
              />
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TroubleshootingPanel;