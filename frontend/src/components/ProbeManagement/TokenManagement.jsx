import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

const TokenManagement = () => {
  const { api } = useApi();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokenVisibility, setTokenVisibility] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Fetch tokens on component mount
  useEffect(() => {
    fetchTokens();
  }, []);

  // Reset copied status after 2 seconds
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  // Fetch all tokens
  const fetchTokens = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get('/api/admin/probe-tokens');
      console.log('Token response:', response);
      
      // Make sure we handle if the response is not an array
      if (Array.isArray(response.data)) {
        setTokens(response.data);
      } else {
        setTokens([]);
        console.log("Response is not an array:", response.data);
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to fetch tokens: ' + (err.response?.data?.error || err.message));
      setTokens([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handle token deletion
  const handleDeleteToken = async () => {
    if (!selectedToken) return;
    
    try {
      await api.delete(`/admin/probe-tokens/${selectedToken.id}`);
      setTokens(tokens.filter(token => token.id !== selectedToken.id));
      setDeleteDialogOpen(false);
      setSelectedToken(null);
    } catch (err) {
      console.error('Error deleting token:', err);
      setError('Failed to delete token: ' + (err.response?.data?.error || err.message));
    }
  };

  // Open delete confirmation dialog (revoke)
  const openDeleteDialog = (token) => {
    setSelectedToken(token);
    setDeleteDialogOpen(true);
  };
  
  // Open permanent delete confirmation dialog
  const openPermanentDeleteDialog = (token) => {
    setSelectedToken(token);
    setPermanentDeleteDialogOpen(true);
  };
  
  // Handle permanent token deletion
  const handlePermanentDeleteToken = async () => {
    if (!selectedToken) return;
    
    try {
      // Add a URL parameter to indicate permanent delete
      await api.delete(`/api/admin/probe-tokens/${selectedToken.id}?permanent=true`);
      setTokens(tokens.filter(token => token.id !== selectedToken.id));
      setPermanentDeleteDialogOpen(false);
      setSelectedToken(null);
    } catch (err) {
      console.error('Error permanently deleting token:', err);
      setError('Failed to permanently delete token: ' + (err.response?.data?.error || err.message));
    }
  };

  // Toggle token visibility
  const toggleTokenVisibility = (tokenId) => {
    setTokenVisibility(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  // Copy token to clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedId(id);
      },
      () => {
        console.error('Failed to copy');
      }
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Check if token is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Get token status
  const getTokenStatus = (token) => {
    if (isExpired(token.expires_at)) {
      return { label: 'Expired', color: 'error' };
    }
    if (token.revoked) {
      return { label: 'Revoked', color: 'error' };
    }
    return { label: 'Active', color: 'success' };
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Probe Node Tokens</Typography>
          </Box>
          <Button 
            variant="outlined"
            onClick={fetchTokens}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : tokens.length === 0 ? (
          <Alert severity="info">
            No tokens found. Generate a new token using the form above.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Node Name</TableCell>
                  <TableCell>Node ID</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Token</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.map((token) => {
                  const status = getTokenStatus(token);
                  return (
                    <TableRow key={token.id}>
                      <TableCell>{token.name || 'Unnamed'}</TableCell>
                      <TableCell>
                        <Tooltip title="Copy Node ID">
                          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                               onClick={() => copyToClipboard(token.node_uuid, `node-${token.id}`)}>
                            <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                              {token.node_uuid.substring(0, 8)}...
                            </Typography>
                            {copiedId === `node-${token.id}` ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{formatDate(token.created_at)}</TableCell>
                      <TableCell>{formatDate(token.expires_at)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={status.label} 
                          color={status.color} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {token.token ? (
                            <>
                              <Typography variant="body2" component="span" sx={{ 
                                fontFamily: 'monospace',
                                maxWidth: '150px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {tokenVisibility[token.id] ? token.token : '••••••••••••••••'}
                              </Typography>
                              <IconButton size="small" onClick={() => toggleTokenVisibility(token.id)}>
                                {tokenVisibility[token.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => copyToClipboard(token.token, `token-${token.id}`)}
                                color={copiedId === `token-${token.id}` ? 'success' : 'default'}
                              >
                                {copiedId === `token-${token.id}` ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                              </IconButton>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              Not available
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          {/* Revoke token button */}
                          <Tooltip title={token.revoked ? "Token already revoked" : "Revoke token"}>
                            <span>
                              <IconButton
                                color="warning"
                                size="small"
                                onClick={() => openDeleteDialog(token)}
                                disabled={token.revoked}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          
                          {/* Permanently delete token button */}
                          <Tooltip title="Permanently delete token">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => openPermanentDeleteDialog(token)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Revoke Token</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke this token? This action cannot be undone and will 
            immediately disconnect any probe nodes using this token.
          </DialogContentText>
          {selectedToken && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Node Name:</strong> {selectedToken.name || 'Unnamed'}
              </Typography>
              <Typography variant="body2">
                <strong>Node ID:</strong> {selectedToken.node_uuid}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(selectedToken.created_at)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteToken} color="warning" variant="contained">
            Revoke Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={permanentDeleteDialogOpen}
        onClose={() => setPermanentDeleteDialogOpen(false)}
      >
        <DialogTitle>Permanently Delete Token</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this token? This action cannot be undone.
            The token will be completely removed from the system.
          </DialogContentText>
          {selectedToken && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Node Name:</strong> {selectedToken.name || 'Unnamed'}
              </Typography>
              <Typography variant="body2">
                <strong>Node ID:</strong> {selectedToken.node_uuid}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(selectedToken.created_at)}
              </Typography>
            </Box>
          )}
          {selectedToken && !selectedToken.revoked && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Warning: This token is still active. Consider revoking it first if you want to
              disconnect probe nodes using it before permanent deletion.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePermanentDeleteToken} color="error" variant="contained">
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TokenManagement;