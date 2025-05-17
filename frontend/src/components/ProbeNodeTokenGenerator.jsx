import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import Divider from '@mui/material/Divider';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';

const ProbeNodeTokenGenerator = () => {
  const { api } = useApi();
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [expireDays, setExpireDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenDialog, setTokenDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [nodeUuid, setNodeUuid] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [heartbeatInterval, setHeartbeatInterval] = useState(15);
  const [logLevel, setLogLevel] = useState('INFO');
  const [generatedTokens, setGeneratedTokens] = useState([]);
  const [showTokenHistory, setShowTokenHistory] = useState(false);

  // Generate a random UUID for node
  const generateNodeUuid = () => {
    return 'node-' + Math.random().toString(36).substring(2, 10) + '-' + 
           Math.random().toString(36).substring(2, 6) + '-' +
           Math.random().toString(36).substring(2, 6);
  };

  // Generate random values for node UUID and reset when node name changes
  useEffect(() => {
    if (!advancedMode) {
      // Only auto-generate if not in advanced mode
      setNodeUuid(generateNodeUuid());
    }
  }, [nodeName, advancedMode]);
  
  // Expanded defensive checks to prevent errors related to DOM properties
  const getSafeNodeName = () => {
    return typeof nodeName === 'string' ? nodeName : '';
  };
  
  // Safe access to DOM element properties
  const getSafeElementProperty = (element, property) => {
    if (!element) return '';
    const value = element[property];
    return typeof value === 'string' ? value : '';
  };

  // Handle token generation
  const handleGenerateToken = async () => {
    const safeNodeName = getSafeNodeName();
    
    if (!safeNodeName.trim()) {
      setError('Node name is required');
      return;
    }

    const safeNodeUuid = typeof nodeUuid === 'string' ? nodeUuid : '';
    if (advancedMode && !safeNodeUuid.trim()) {
      setError('Node UUID is required in advanced mode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use provided UUID or generate one
      const finalNodeUuid = advancedMode && nodeUuid ? nodeUuid : generateNodeUuid();
      
      let apiKey;
      
      if (advancedMode && customApiKey) {
        // Use custom API key if provided in advanced mode
        apiKey = customApiKey;
      } else {
        // Create a new API key for this node
        const keyResponse = await api.post('/api/keys', {
          name: `Node: ${nodeName}`,
          expiry_days: parseInt(expireDays, 10)
        });
        
        // Get the API key from the response
        apiKey = keyResponse.data.key || keyResponse.data.token || keyResponse.data.value;
        
        if (!apiKey) {
          throw new Error('Failed to generate API key');
        }
      }

      // Register the node with the backend
      // Modified to use the correct endpoint
      try {
        const nodeResponse = await api.post('/api/probe-nodes', {
          node_uuid: finalNodeUuid,
          name: nodeName,
          description: nodeDescription,
          metadata: {
            created_at: new Date().toISOString(),
            created_by: 'admin-panel',
            pending_activation: true
          }
        });
        console.log('Node registration successful:', nodeResponse.data);
      } catch (registerError) {
        console.warn('Node pre-registration failed, will continue with token generation:', registerError);
        // Continue with token generation even if node registration fails
      }

      // Now generate a token that combines the node UUID and API key
      const tokenResponse = await api.post('/api/admin/generate-probe-token', {
        node_uuid: finalNodeUuid,
        api_key: apiKey,
        name: nodeName,
        description: nodeDescription,
        expiry_days: expireDays,
        heartbeat_interval: heartbeatInterval,
        log_level: logLevel
      });

      // Set the generated token
      setGeneratedToken(tokenResponse.data.token);
      
      // Add to the list of generated tokens with timestamp
      const newToken = {
        id: Date.now(),
        token: tokenResponse.data.token.substring(0, 20) + '...',
        fullToken: tokenResponse.data.token,
        name: nodeName,
        description: nodeDescription || 'No description',
        date: new Date().toISOString(),
        nodeUuid: finalNodeUuid,
        heartbeatInterval,
        logLevel,
        expireDays
      };
      
      setGeneratedTokens(prev => [newToken, ...prev]);
      
      // Show the token dialog
      setTokenDialog(true);
      
      // Reset form
      setNodeName('');
      setNodeDescription('');
      
    } catch (error) {
      console.error('Error generating token:', error);
      setError('Failed to generate token: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    navigator.clipboard.writeText(generatedToken).then(
      () => {
        setSnackbarMessage('Token copied to clipboard');
        setSnackbarOpen(true);
      },
      () => {
        setError('Failed to copy token');
      }
    );
  };
  
  // Copy token from history to clipboard
  const handleCopyHistoryToken = (token) => {
    navigator.clipboard.writeText(token).then(
      () => {
        setSnackbarMessage('Token copied to clipboard');
        setSnackbarOpen(true);
      },
      () => {
        setError('Failed to copy token');
      }
    );
  };
  
  // Remove token from history
  const handleRemoveToken = (tokenId) => {
    setGeneratedTokens(prev => prev.filter(token => token.id !== tokenId));
    setSnackbarMessage('Token removed from history');
    setSnackbarOpen(true);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Generate Probe Node Token</Typography>
        <Box>
          <Tooltip title="Toggle token history">
            <IconButton 
              onClick={() => setShowTokenHistory(!showTokenHistory)}
              color={showTokenHistory ? "primary" : "default"}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Learn more about probe node tokens">
            <IconButton onClick={() => setInfoDialogOpen(true)}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Generate Token Form - ALWAYS SHOWN FIRST */}
      <Paper sx={{ p: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom>
          Create a token for a new probe node deployment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This token will contain all necessary configuration for setting up a new probe node.
          The node will use this token to connect to the backend and perform diagnostics.
        </Typography>

        <Box component="form" noValidate sx={{ mt: 1 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            mb: 2
          }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Connection Configuration
            </Typography>
            <Typography variant="body2">
              <strong>Backend URL:</strong> {window.location.origin}
            </Typography>
            <Typography variant="body2">
              <strong>Node UUID:</strong> {nodeUuid}
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
                name="advancedMode"
                color="primary"
              />
            }
            label="Advanced Configuration Mode"
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="nodeName"
            label="Node Name"
            name="nodeName"
            autoComplete="off"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            fullWidth
            id="nodeDescription"
            label="Description (Optional)"
            name="nodeDescription"
            autoComplete="off"
            value={nodeDescription}
            onChange={(e) => setNodeDescription(e.target.value)}
            disabled={loading}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          {advancedMode && (
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                id="nodeUuid"
                label="Node UUID"
                name="nodeUuid"
                autoComplete="off"
                value={nodeUuid}
                onChange={(e) => setNodeUuid(e.target.value)}
                disabled={loading}
                helperText="A unique identifier for this probe node"
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
                <InputLabel id="heartbeat-interval-label">Heartbeat Interval</InputLabel>
                <Select
                  labelId="heartbeat-interval-label"
                  id="heartbeatInterval"
                  value={heartbeatInterval || 15}
                  label="Heartbeat Interval"
                  onChange={(e) => setHeartbeatInterval(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value={5}>5 Seconds</MenuItem>
                  <MenuItem value={15}>15 Seconds</MenuItem>
                  <MenuItem value={30}>30 Seconds</MenuItem>
                  <MenuItem value={60}>1 Minute</MenuItem>
                  <MenuItem value={300}>5 Minutes</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
                <InputLabel id="log-level-label">Log Level</InputLabel>
                <Select
                  labelId="log-level-label"
                  id="logLevel"
                  value={logLevel || "INFO"}
                  label="Log Level"
                  onChange={(e) => setLogLevel(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="DEBUG">DEBUG - Verbose logging</MenuItem>
                  <MenuItem value="INFO">INFO - Standard logging</MenuItem>
                  <MenuItem value="WARNING">WARNING - Only warnings and errors</MenuItem>
                  <MenuItem value="ERROR">ERROR - Only errors</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="expiration-label">Token Expiration</InputLabel>
            <Select
              labelId="expiration-label"
              id="expiration"
              value={expireDays}
              label="Token Expiration"
              onChange={(e) => setExpireDays(e.target.value)}
              disabled={loading}
            >
              <MenuItem value={1}>1 Day</MenuItem>
              <MenuItem value={7}>7 Days</MenuItem>
              <MenuItem value={30}>30 Days</MenuItem>
              <MenuItem value={90}>90 Days</MenuItem>
              <MenuItem value={365}>1 Year</MenuItem>
              <MenuItem value={0}>Never Expires</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              onClick={handleGenerateToken}
              disabled={loading || !getSafeNodeName().trim()}
            >
              Generate Token
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Token History Display - SHOWN BELOW */}
      {showTokenHistory && generatedTokens.length > 0 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Recent Generated Tokens
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Token</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {generatedTokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>{getSafeElementProperty(token, 'name')}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {getSafeElementProperty(token, 'token')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {token && token.date ? new Date(token.date).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {token && token.expireDays === 0 ? 
                        'Never' : 
                        `${token.expireDays || 0} ${(token.expireDays || 0) === 1 ? 'day' : 'days'}`
                      }
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Copy full token">
                        <IconButton size="small" onClick={() => handleCopyHistoryToken(getSafeElementProperty(token, 'fullToken'))}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from history">
                        <IconButton size="small" onClick={() => handleRemoveToken(token.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Token Generated Dialog */}
      <Dialog
        open={tokenDialog}
        onClose={() => setTokenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Probe Node Token Generated</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Your token has been generated successfully. Use this token to configure your probe node:
          </DialogContentText>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            This token will only be shown once. Make sure to copy it now.
          </Alert>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            fontFamily: 'monospace',
            position: 'relative',
            maxHeight: '100px',
            overflow: 'auto',
            wordBreak: 'break-all'
          }}>
            {generatedToken}
            <IconButton 
              sx={{ position: 'absolute', top: 8, right: 8 }}
              onClick={handleCopyToken}
            >
              <CopyIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Deployment Instructions
            </Typography>
            <Typography variant="body2">
              1. Install the probe node on your target server<br />
              2. Run the following command to configure the probe node:<br />
              <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 1, fontFamily: 'monospace' }}>
                python run_probe_node_token.py --token "{generatedToken}"
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Or use the deployment script:
              </Typography>
              <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 0.5, fontFamily: 'monospace' }}>
                ./deploy-probe.sh "{generatedToken}"
              </Box>
              <Typography variant="caption" sx={{ mt: 1 }}>
                Node Configuration Parameters (included in token):
              </Typography>
              <Box sx={{ 
                bgcolor: 'background.default', 
                p: 1, 
                borderRadius: 1, 
                mt: 0.5, 
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}>
                NODE_UUID: {nodeUuid}<br />
                NODE_NAME: {nodeName}<br />
                BACKEND_URL: {window.location.origin}<br />
                HEARTBEAT_INTERVAL: {heartbeatInterval} seconds<br />
                LOG_LEVEL: {logLevel}
              </Box>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<CopyIcon />}
            onClick={handleCopyToken}
          >
            Copy Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
      
      {/* Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
      >
        <DialogTitle>About Probe Node Tokens</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography paragraph>
              <strong>What are Probe Node Tokens?</strong><br />
              Probe Node Tokens are secure JWT tokens that contain all the necessary configuration for a probe node deployment. 
              These tokens eliminate the need to manually configure environment variables on each probe node.
            </Typography>
            
            <Typography paragraph>
              <strong>What information is stored in the token?</strong><br />
              Each token contains:
              <ul>
                <li>Node UUID - A unique identifier for the probe node</li>
                <li>API Key - A pre-generated API key for secure backend communication</li>
                <li>Backend URL - The URL of the ProbeOps backend</li>
                <li>Other configuration parameters needed for operation</li>
              </ul>
            </Typography>
            
            <Typography paragraph>
              <strong>How do I use the token?</strong><br />
              Simply generate a token through this interface, then provide it to the probe node during setup:
              <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, mt: 1, fontFamily: 'monospace' }}>
                python run_probe_node.py --token "YOUR_TOKEN_HERE"
              </Box>
              The token will be automatically decoded by the probe node script, extracting all necessary configuration.
            </Typography>
            
            <Typography>
              <strong>Security</strong><br />
              Tokens are signed with a secure key and can include an expiration date. They should be treated as secrets and not shared publicly.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={<CheckIcon />}
      />
    </Box>
  );
};

export default ProbeNodeTokenGenerator;