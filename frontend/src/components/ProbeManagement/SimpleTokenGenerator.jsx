import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  VpnKey as VpnKeyIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

const SimpleTokenGenerator = () => {
  const { api } = useApi();
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [expireDays, setExpireDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [heartbeatInterval, setHeartbeatInterval] = useState(15);
  const [logLevel, setLogLevel] = useState('INFO');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate a token
  const handleGenerateToken = async () => {
    if (!nodeName.trim()) {
      setError('Node name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create random node UUID
      const nodeUuid = 'node-' + Math.random().toString(36).substring(2, 10);
      
      // Random API key
      const apiKey = 'pk_' + Math.random().toString(36).substring(2, 15);
      
      // Build token request
      const requestData = {
        node_uuid: nodeUuid,
        api_key: apiKey,
        name: nodeName,
        description: nodeDescription,
        expiry_days: parseInt(expireDays),
        heartbeat_interval: parseInt(heartbeatInterval),
        log_level: logLevel
      };

      // Make API request
      const response = await api.post('/api/admin/generate-probe-token', requestData);
      
      // Store token data
      setGeneratedToken(response.data.token);
      setTokenData({
        node_uuid: nodeUuid,
        token: response.data.token,
        created_at: new Date().toISOString()
      });
      
      // Show token dialog
      setShowTokenDialog(true);
      
      // Reset form
      setNodeName('');
      setNodeDescription('');
      
    } catch (err) {
      console.error('Error generating token:', err);
      setError('Failed to generate token: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Copy token to clipboard
  const handleCopyToken = () => {
    navigator.clipboard.writeText(generatedToken).then(
      () => {
        showNotification('Token copied to clipboard', 'success');
      },
      () => {
        showNotification('Failed to copy token', 'error');
      }
    );
  };
  
  // Copy token data as shell env variables
  const handleCopyAsEnv = () => {
    if (!tokenData) return;
    
    const envVars = [
      'export PROBEOPS_NODE_UUID="' + tokenData.node_uuid + '"',
      'export PROBEOPS_TOKEN="' + generatedToken + '"',
      'export PROBEOPS_HEARTBEAT_INTERVAL="' + heartbeatInterval + '"',
      'export PROBEOPS_LOG_LEVEL="' + logLevel + '"'
    ].join('\\n');
    
    navigator.clipboard.writeText(envVars).then(
      () => {
        showNotification('Environment variables copied to clipboard', 'success');
      },
      () => {
        showNotification('Failed to copy environment variables', 'error');
      }
    );
  };
  
  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VpnKeyIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Generate Probe Node Token</Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a token for a new probe node. This token contains all necessary configuration for 
          the node to connect to the ProbeOps network.
        </Typography>

        <TextField
          label="Node Name"
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
          required
          fullWidth
          margin="normal"
          helperText="A descriptive name for this probe node"
        />
        
        <TextField
          label="Node Description"
          value={nodeDescription}
          onChange={(e) => setNodeDescription(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={2}
          helperText="Optional details about this node's purpose or location"
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            }
            label="Show Advanced Options"
          />
        </Box>
        
        {showAdvanced && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.default', 
            borderRadius: 1,
            mb: 2
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Configuration
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Heartbeat Interval (seconds)"
                type="number"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(e.target.value)}
                fullWidth
                margin="normal"
                inputProps={{ min: 5, max: 300 }}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  label="Log Level"
                >
                  <MenuItem value="DEBUG">DEBUG</MenuItem>
                  <MenuItem value="INFO">INFO</MenuItem>
                  <MenuItem value="WARNING">WARNING</MenuItem>
                  <MenuItem value="ERROR">ERROR</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}
        
        <TextField
          label="Token Expiry (Days)"
          type="number"
          value={expireDays}
          onChange={(e) => setExpireDays(e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 365 }}
          helperText="Number of days before this token expires"
        />
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateToken}
            disabled={loading}
            startIcon={loading ? null : <AddIcon />}
            sx={{ minWidth: 150 }}
          >
            {loading ? 'Generating...' : 'Generate Token'}
          </Button>
        </Box>
      </Paper>
      
      {/* Token Dialog */}
      <Dialog
        open={showTokenDialog}
        onClose={() => setShowTokenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Token Generated Successfully
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Your probe node token has been generated. Copy this token now as it will only be shown once.
          </DialogContentText>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">Token Details</Typography>
            <Typography variant="body2" component="div" sx={{ mb: 1, wordBreak: 'break-all', fontFamily: 'monospace', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
              {generatedToken}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={handleCopyToken}
              size="small"
              sx={{ mt: 1 }}
            >
              Copy Token
            </Button>
          </Paper>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Deployment Instructions
          </Typography>
          <Typography variant="body2" paragraph>
            1. Install the ProbeOps agent on your server
          </Typography>
          <Typography variant="body2" paragraph>
            2. Set the environment variables with this token
          </Typography>
          <Typography variant="body2" paragraph>
            3. Run the agent to establish the connection
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<CopyIcon />}
            onClick={handleCopyAsEnv}
            size="small"
          >
            Copy as Environment Variables
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTokenDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SimpleTokenGenerator;