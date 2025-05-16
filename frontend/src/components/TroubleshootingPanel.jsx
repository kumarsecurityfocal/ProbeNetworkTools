import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Router as RouterIcon,
  CloudSync as CloudSyncIcon
} from '@mui/icons-material';
import { executeSystemCommand, getConfigurationSettings, updateConfigurationSettings, 
         getLogs, clearLogs, getSystemStatus, getApiEndpointStatus, 
         runDiagnosticTest } from '../services/troubleshooting';

// Function to format date/time
const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  return date.toLocaleString();
};

// Troubleshooting Dashboard Component
const TroubleshootingPanel = () => {
  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState({
    backend: [],
    frontend: [],
    nginx: [],
    probe: []
  });
  const [configs, setConfigs] = useState({
    debug_mode: false,
    log_level: 'INFO',
    api_timeout: 30,
    websocket_heartbeat: 15,
    api_rate_limit: 100
  });
  const [systemStatus, setSystemStatus] = useState({
    backend: 'unknown',
    frontend: 'unknown',
    database: 'unknown',
    nginx: 'unknown'
  });
  const [apiStatus, setApiStatus] = useState([]);
  const [loading, setLoading] = useState({
    logs: false,
    configs: false,
    status: false,
    apis: false
  });
  const [command, setCommand] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [diagnosticTest, setDiagnosticTest] = useState({
    type: 'database',
    running: false,
    result: null
  });

  // Fetch initial data
  useEffect(() => {
    fetchSystemStatus();
    fetchConfigurations();
    fetchApiStatus();
  }, []);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Load data based on selected tab
    if (newValue === 0) {
      fetchSystemStatus();
    } else if (newValue === 1) {
      fetchLogs('backend');
    } else if (newValue === 2) {
      fetchConfigurations();
    } else if (newValue === 3) {
      fetchApiStatus();
    }
  };

  // Fetch system status
  const fetchSystemStatus = async () => {
    setLoading({ ...loading, status: true });
    try {
      const status = await getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      showNotification('Failed to fetch system status', 'error');
    } finally {
      setLoading({ ...loading, status: false });
    }
  };

  // Fetch logs
  const fetchLogs = async (logType) => {
    setLoading({ ...loading, logs: true });
    try {
      const logData = await getLogs(logType);
      setLogs({ ...logs, [logType]: logData });
    } catch (error) {
      showNotification(`Failed to fetch ${logType} logs`, 'error');
    } finally {
      setLoading({ ...loading, logs: false });
    }
  };

  // Clear logs
  const handleClearLogs = async (logType) => {
    try {
      await clearLogs(logType);
      setLogs({ ...logs, [logType]: [] });
      showNotification(`${logType} logs cleared successfully`, 'success');
    } catch (error) {
      showNotification(`Failed to clear ${logType} logs`, 'error');
    }
  };

  // Download logs
  const handleDownloadLogs = (logType) => {
    try {
      const logText = logs[logType].map(log => 
        `[${log.timestamp}] [${log.level}] ${log.message}`
      ).join('\n');
      
      const element = document.createElement('a');
      const file = new Blob([logText], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `probeops_${logType}_logs_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      showNotification(`${logType} logs downloaded successfully`, 'success');
    } catch (error) {
      showNotification(`Failed to download ${logType} logs`, 'error');
    }
  };

  // Fetch configurations
  const fetchConfigurations = async () => {
    setLoading({ ...loading, configs: true });
    try {
      const configData = await getConfigurationSettings();
      setConfigs(configData);
    } catch (error) {
      showNotification('Failed to fetch configuration settings', 'error');
    } finally {
      setLoading({ ...loading, configs: false });
    }
  };

  // Update configuration
  const handleConfigChange = (config, value) => {
    setConfigs({ ...configs, [config]: value });
  };

  // Save configuration changes
  const saveConfigChanges = async () => {
    try {
      await updateConfigurationSettings(configs);
      showNotification('Configuration updated successfully', 'success');
    } catch (error) {
      showNotification('Failed to update configuration', 'error');
    }
  };

  // Fetch API endpoint status
  const fetchApiStatus = async () => {
    setLoading({ ...loading, apis: true });
    try {
      const statusData = await getApiEndpointStatus();
      setApiStatus(statusData);
    } catch (error) {
      showNotification('Failed to fetch API endpoint status', 'error');
    } finally {
      setLoading({ ...loading, apis: false });
    }
  };

  // Execute system command
  const executeCommand = async () => {
    if (!command.trim()) {
      showNotification('Please enter a command', 'warning');
      return;
    }
    
    try {
      const output = await executeSystemCommand(command);
      setCommandOutput(output);
      showNotification('Command executed successfully', 'success');
    } catch (error) {
      setCommandOutput(`Error: ${error.message}`);
      showNotification('Command execution failed', 'error');
    }
  };

  // Run diagnostic test
  const runDiagnostic = async () => {
    setDiagnosticTest({ ...diagnosticTest, running: true, result: null });
    try {
      const result = await runDiagnosticTest(diagnosticTest.type);
      setDiagnosticTest({ ...diagnosticTest, running: false, result });
      showNotification('Diagnostic test completed', 'success');
    } catch (error) {
      setDiagnosticTest({ ...diagnosticTest, running: false, result: { error: error.message } });
      showNotification('Diagnostic test failed', 'error');
    }
  };

  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <BugReportIcon sx={{ mr: 1 }} /> Troubleshooting Dashboard
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="System Status" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="Logs" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Configuration" icon={<ApiIcon />} iconPosition="start" />
          <Tab label="API Diagnostics" icon={<RouterIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      {/* System Status Tab */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">System Components Status</Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              variant="outlined" 
              onClick={fetchSystemStatus}
              disabled={loading.status}
            >
              Refresh Status
            </Button>
          </Box>
          
          {loading.status ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {Object.entries(systemStatus).map(([service, status]) => (
                <Grid item xs={12} sm={6} md={3} key={service}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      bgcolor: 
                        status === 'healthy' ? 'success.light' : 
                        status === 'degraded' ? 'warning.light' : 
                        status === 'down' ? 'error.light' : 
                        'grey.300'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {service}
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                        Status: {status}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>Run Diagnostic Test</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Diagnostic Type</InputLabel>
              <Select
                value={diagnosticTest.type}
                label="Diagnostic Type"
                onChange={(e) => setDiagnosticTest({ ...diagnosticTest, type: e.target.value })}
              >
                <MenuItem value="database">Database Connectivity</MenuItem>
                <MenuItem value="api">API Endpoints</MenuItem>
                <MenuItem value="filesystem">File System Permissions</MenuItem>
                <MenuItem value="network">Network Connectivity</MenuItem>
                <MenuItem value="performance">Performance Test</MenuItem>
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              onClick={runDiagnostic}
              disabled={diagnosticTest.running}
              startIcon={diagnosticTest.running ? <CircularProgress size={20} /> : <BugReportIcon />}
            >
              {diagnosticTest.running ? 'Running...' : 'Run Diagnostic'}
            </Button>
          </Box>
          
          {diagnosticTest.result && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1">Diagnostic Results:</Typography>
              <pre style={{ 
                overflowX: 'auto', 
                backgroundColor: '#f5f5f5', 
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {JSON.stringify(diagnosticTest.result, null, 2)}
              </pre>
            </Paper>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>Execute System Command</Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              label="System Command"
              variant="outlined"
              fullWidth
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter a system command..."
              helperText="Usage: Only predefined safe commands are allowed (ps, df, free, netstat, etc.)"
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={executeCommand}
            >
              Execute Command
            </Button>
          </Box>
          
          {commandOutput && (
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1">Command Output:</Typography>
              <pre style={{ 
                overflowX: 'auto', 
                backgroundColor: '#f5f5f5', 
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {commandOutput}
              </pre>
            </Paper>
          )}
        </Paper>
      )}
      
      {/* Logs Tab */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Tabs 
            value={Object.keys(logs).findIndex(logType => logType === 'backend')} 
            onChange={(e, newValue) => fetchLogs(Object.keys(logs)[newValue])}
            sx={{ mb: 2 }}
          >
            <Tab label="Backend Logs" />
            <Tab label="Frontend Logs" />
            <Tab label="NGINX Logs" />
            <Tab label="Probe Logs" />
          </Tabs>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Backend Logs</Typography>
            <Box>
              <Button 
                startIcon={<RefreshIcon />} 
                variant="outlined" 
                onClick={() => fetchLogs('backend')}
                sx={{ mr: 1 }}
                disabled={loading.logs}
              >
                Refresh
              </Button>
              <Button 
                startIcon={<DownloadIcon />} 
                variant="outlined" 
                onClick={() => handleDownloadLogs('backend')}
                sx={{ mr: 1 }}
                disabled={!logs.backend.length}
              >
                Download
              </Button>
              <Button 
                startIcon={<DeleteIcon />} 
                variant="outlined" 
                color="error"
                onClick={() => handleClearLogs('backend')}
                disabled={!logs.backend.length}
              >
                Clear
              </Button>
            </Box>
          </Box>
          
          {loading.logs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.backend.length > 0 ? (
            <Paper 
              sx={{ 
                maxHeight: '500px', 
                overflow: 'auto', 
                bgcolor: '#1e1e1e', 
                color: '#fff', 
                p: 2,
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {logs.backend.map((log, index) => (
                <Box key={index} sx={{ 
                  mb: 1, 
                  pb: 1, 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  color: 
                    log.level === 'ERROR' ? '#ff6b6b' : 
                    log.level === 'WARNING' ? '#ffd166' : 
                    log.level === 'INFO' ? '#63c7ff' : 
                    '#ffffff'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {formatDateTime(log.timestamp)}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 'bold',
                      bgcolor: 
                        log.level === 'ERROR' ? 'rgba(255,0,0,0.2)' : 
                        log.level === 'WARNING' ? 'rgba(255,200,0,0.2)' : 
                        log.level === 'INFO' ? 'rgba(0,150,255,0.2)' : 
                        'transparent',
                      px: 1,
                      borderRadius: 1
                    }}>
                      {log.level}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {log.message}
                  </Typography>
                </Box>
              ))}
            </Paper>
          ) : (
            <Alert severity="info">No logs available. Try refreshing or checking a different log type.</Alert>
          )}
        </Paper>
      )}
      
      {/* Configuration Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">System Configuration</Typography>
            <Box>
              <Button 
                startIcon={<RefreshIcon />} 
                variant="outlined" 
                onClick={fetchConfigurations}
                sx={{ mr: 1 }}
                disabled={loading.configs}
              >
                Refresh
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={saveConfigChanges}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
          
          {loading.configs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={configs.debug_mode} 
                      onChange={(e) => handleConfigChange('debug_mode', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Debug Mode"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Enables verbose logging and additional debug information
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Log Level</InputLabel>
                  <Select
                    value={configs.log_level}
                    label="Log Level"
                    onChange={(e) => handleConfigChange('log_level', e.target.value)}
                  >
                    <MenuItem value="DEBUG">DEBUG</MenuItem>
                    <MenuItem value="INFO">INFO</MenuItem>
                    <MenuItem value="WARNING">WARNING</MenuItem>
                    <MenuItem value="ERROR">ERROR</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Determines the minimum severity level for recorded logs
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="API Timeout (seconds)"
                  type="number"
                  value={configs.api_timeout}
                  onChange={(e) => handleConfigChange('api_timeout', parseInt(e.target.value))}
                  fullWidth
                  helperText="Maximum time to wait for API responses"
                  InputProps={{ inputProps: { min: 1, max: 120 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="WebSocket Heartbeat (seconds)"
                  type="number"
                  value={configs.websocket_heartbeat}
                  onChange={(e) => handleConfigChange('websocket_heartbeat', parseInt(e.target.value))}
                  fullWidth
                  helperText="Interval between WebSocket heartbeat messages"
                  InputProps={{ inputProps: { min: 5, max: 60 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="API Rate Limit (requests per minute)"
                  type="number"
                  value={configs.api_rate_limit}
                  onChange={(e) => handleConfigChange('api_rate_limit', parseInt(e.target.value))}
                  fullWidth
                  helperText="Maximum number of API requests allowed per minute per user"
                  InputProps={{ inputProps: { min: 10, max: 1000 } }}
                />
              </Grid>
            </Grid>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>Service Controls</Typography>
          <Grid container spacing={2}>
            {['backend', 'nginx', 'database'].map((service) => (
              <Grid item xs={12} sm={4} key={service}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {service}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        variant="outlined" 
                        color="primary"
                        disabled={systemStatus[service] === 'healthy'}
                      >
                        Start
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary"
                        disabled={systemStatus[service] !== 'healthy'}
                      >
                        Restart
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error"
                        disabled={systemStatus[service] === 'down'}
                      >
                        Stop
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* API Diagnostics Tab */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">API Endpoint Status</Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              variant="outlined" 
              onClick={fetchApiStatus}
              disabled={loading.apis}
            >
              Refresh Status
            </Button>
          </Box>
          
          {loading.apis ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : apiStatus.length > 0 ? (
            <Box>
              <List>
                {apiStatus.map((endpoint, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={endpoint.path}
                      secondary={`Method: ${endpoint.method} | Response Time: ${endpoint.responseTime}ms`}
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={endpoint.status} 
                        color={
                          endpoint.status === 'OK' ? 'success' : 
                          endpoint.status === 'Slow' ? 'warning' : 
                          'error'
                        }
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Last checked: {formatDateTime(new Date().toISOString())}
              </Typography>
            </Box>
          ) : (
            <Alert severity="info">No API endpoint data available. Click Refresh to check status.</Alert>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>Connection Test</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Target URL"
                variant="outlined"
                fullWidth
                placeholder="https://api.example.com/endpoint"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Button variant="contained" sx={{ mr: 1 }}>
                  Test Connection
                </Button>
                <Button variant="outlined">
                  Check Headers
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TroubleshootingPanel;