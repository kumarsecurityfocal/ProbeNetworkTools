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
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Snackbar
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// A completely simplified token management component that avoids problematic DOM operations
const SimpleTokenManager = () => {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expireDays, setExpireDays] = useState(30);
  const [showRegion, setShowRegion] = useState(false);
  const [region, setRegion] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokens, setTokens] = useState([]);
  const [showTokens, setShowTokens] = useState(true);
  const [notification, setNotification] = useState({
    open: false,
    message: ''
  });

  // Load tokens on mount
  useEffect(() => {
    fetchTokens();
  }, []);

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/probe-nodes/registration-token?include_expired=false&include_used=false');
      
      if (response.ok) {
        const data = await response.json();
        setTokens(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch tokens');
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate token
  const handleGenerateToken = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tokenData = {
        description: description.trim(),
        expiryHours: expireDays * 24,
      };

      if (showRegion && region.trim()) {
        tokenData.region = region.trim();
      }

      const response = await fetch('/api/probe-nodes/registration-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update tokens list
        setTokens(prev => [
          {
            ...data,
            name,
            date: new Date().toISOString(),
            expireDays
          },
          ...prev
        ]);

        // Reset form
        setName('');
        setDescription('');
        setRegion('');
        
        // Show notification
        setNotification({
          open: true,
          message: 'Token generated successfully'
        });
      } else {
        setError('Failed to generate token');
      }
    } catch (err) {
      console.error('Error generating token:', err);
      setError('Failed to generate token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy token to clipboard
  const handleCopyToken = (token) => {
    navigator.clipboard.writeText(token).then(
      () => {
        setNotification({
          open: true,
          message: 'Token copied to clipboard'
        });
      },
      () => {
        setError('Failed to copy token');
      }
    );
  };

  // Remove token
  const handleRemoveToken = async (tokenId) => {
    try {
      const response = await fetch(`/api/probe-nodes/registration-token/${tokenId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTokens(prev => prev.filter(token => token.id !== tokenId));
        
        setNotification({
          open: true,
          message: 'Token removed successfully'
        });
      } else {
        setError('Failed to remove token');
      }
    } catch (err) {
      console.error('Error removing token:', err);
      setError('Failed to remove token: ' + err.message);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Token Management
      </Typography>

      {/* Token Generation Form - ALWAYS FIRST */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Token
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleGenerateToken}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Expiration</InputLabel>
                <Select
                  value={expireDays}
                  onChange={(e) => setExpireDays(e.target.value)}
                  label="Expiration"
                  disabled={loading}
                >
                  <MenuItem value={1}>1 Day</MenuItem>
                  <MenuItem value={7}>7 Days</MenuItem>
                  <MenuItem value={30}>30 Days</MenuItem>
                  <MenuItem value={90}>90 Days</MenuItem>
                  <MenuItem value={365}>1 Year</MenuItem>
                  <MenuItem value={0}>Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showRegion}
                    onChange={(e) => setShowRegion(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Specify Region"
              />
            </Grid>

            {showRegion && (
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  fullWidth
                  disabled={loading}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                disabled={loading || !name.trim()}
                sx={{ mt: 2 }}
              >
                Generate Token
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <FormControlLabel
          control={
            <Switch
              checked={showTokens}
              onChange={(e) => setShowTokens(e.target.checked)}
            />
          }
          label="Show Tokens"
        />
      </Paper>

      {/* Token List - AFTER GENERATION FORM */}
      {showTokens && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Generated Tokens
          </Typography>

          {loading && tokens.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : tokens.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No tokens available
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tokens.map((token) => (
                <Card key={token.id || Math.random()} sx={{ width: '100%' }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1">
                          {token.name || 'Unnamed Token'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Created: {token.date ? new Date(token.date).toLocaleString() : 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Typography variant="subtitle2">Token:</Typography>
                        <Box 
                          sx={{ 
                            p: 1, 
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {token.token}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="body2">
                          Expires: {token.expireDays === 0 ? 'Never' : 
                            `${token.expireDays || '30'} days`}
                        </Typography>
                        {token.region && (
                          <Typography variant="body2">
                            Region: {token.region}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopyToken(token.token)}
                    >
                      Copy
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleRemoveToken(token.id)}
                    >
                      Remove
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
      />
    </Box>
  );
};

export default SimpleTokenManager;