import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  FilterList as FilterIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';

const ApiTokenDisplay = () => {
  const { api } = useApi();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('30');
  const [showTokenValue, setShowTokenValue] = useState({});
  const [copySuccess, setCopySuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Function to refresh tokens
  const fetchTokens = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/keys');
      // Make sure we're getting an array back
      const tokensArray = Array.isArray(response.data) ? response.data : 
        (response.data.tokens || response.data.keys || []);
      
      // Inspect the response structure for debugging
      console.log('Token API response structure:', JSON.stringify(response.data, null, 2));
      
      setTokens(tokensArray);
    } catch (error) {
      console.error('Error fetching API tokens:', error);
      setError('Failed to load API tokens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load tokens on component mount
  useEffect(() => {
    fetchTokens();
  }, []);

  // Function to handle creating a new token
  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      setError('Token name is required');
      return;
    }

    try {
      const response = await api.post('/api/keys', {
        name: newTokenName,
        expiry_days: parseInt(newTokenExpiry, 10)
      });

      // Add the new token to our list
      setTokens(prevTokens => {
        // Check if we got a valid response with a token
        if (response.data && (response.data.key || response.data.token || response.data.value)) {
          const newToken = {
            id: response.data.id || Date.now(),
            name: newTokenName,
            key: response.data.key || response.data.token || response.data.value,
            created_at: new Date().toISOString(),
            expires_at: response.data.expires_at || null
          };
          return [...prevTokens, newToken];
        }
        return prevTokens;
      });

      // Reset form and close dialog
      setNewTokenName('');
      setNewTokenExpiry('30');
      setOpenDialog(false);
      
      // Show success message
      setCopySuccess('Token created successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error creating API token:', error);
      setError('Failed to create API token. Please try again.');
    }
  };

  // Function to handle revoking a token
  const handleRevokeToken = async (tokenId) => {
    try {
      await api.delete(`/api/keys/${tokenId}`);
      
      // Remove the token from our list
      setTokens(prevTokens => prevTokens.filter(token => token.id !== tokenId));
      
      // Show success message
      setCopySuccess('Token revoked successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error revoking API token:', error);
      setError('Failed to revoke API token. Please try again.');
    }
  };

  // Function to copy token to clipboard
  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token).then(
      () => {
        setCopySuccess('Token copied to clipboard');
        setSnackbarOpen(true);
      },
      () => {
        setError('Failed to copy token. Please try manually.');
      }
    );
  };

  // Function to toggle token visibility
  const toggleTokenVisibility = (tokenId) => {
    setShowTokenValue(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  // Calculate expiry status
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return 'Never expires';
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    
    if (expiry < now) {
      return 'Expired';
    }
    
    const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 7 ? `${daysRemaining} days left` : 'Active';
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">API Tokens</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            sx={{ mr: 1 }}
            onClick={fetchTokens}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Create Token
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : tokens.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No API tokens found. Create a new token to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tokens.map((token) => {
                const expiryStatus = getExpiryStatus(token.expires_at);
                return (
                  <TableRow key={token.id}>
                    <TableCell>{token.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ 
                          fontFamily: 'monospace', 
                          mr: 1,
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {showTokenValue[token.id] ? token.key : '••••••••••••••••'}
                        </Typography>
                        <Tooltip title={showTokenValue[token.id] ? "Hide token" : "Show token"}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleTokenVisibility(token.id)}
                          >
                            {showTokenValue[token.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy to clipboard">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyToken(token.key)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(token.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={expiryStatus} 
                        size="small"
                        color={
                          expiryStatus === 'Expired' ? 'error' : 
                          expiryStatus.includes('days left') ? 'warning' : 
                          'success'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRevokeToken(token.id)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog for creating new token */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New API Token</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Token Name"
            type="text"
            fullWidth
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Expiry (days)"
            type="number"
            fullWidth
            value={newTokenExpiry}
            onChange={(e) => setNewTokenExpiry(e.target.value)}
            inputProps={{ min: 1 }}
            helperText="Enter 0 for no expiration"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateToken} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CheckIcon fontSize="inherit" />}
        >
          {copySuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApiTokenDisplay;