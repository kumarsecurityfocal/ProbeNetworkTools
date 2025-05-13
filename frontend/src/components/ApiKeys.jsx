import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { getApiKeys, createApiKey, deleteApiKey, deactivateApiKey } from '../services/api';

const ApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    expires_days: 30
  });
  const [formErrors, setFormErrors] = useState({});
  const [copySuccess, setCopySuccess] = useState('');
  
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError('');
      const keys = await getApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError('Failed to load API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchApiKeys();
  }, []);
  
  const handleCreateDialogOpen = () => {
    setOpenCreateDialog(true);
    setFormData({
      name: '',
      expires_days: 30
    });
    setFormErrors({});
  };
  
  const handleCreateDialogClose = () => {
    setOpenCreateDialog(false);
  };
  
  const handleDeleteDialogOpen = (apiKey) => {
    setSelectedKey(apiKey);
    setOpenDeleteDialog(true);
  };
  
  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
    setSelectedKey(null);
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'API key name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleCreateApiKey = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const newApiKey = await createApiKey(formData);
      setApiKeys([newApiKey, ...apiKeys]);
      handleCreateDialogClose();
    } catch (err) {
      console.error('Error creating API key:', err);
      setFormErrors({
        ...formErrors,
        submit: 'Failed to create API key. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteApiKey = async () => {
    if (!selectedKey) return;
    
    try {
      setLoading(true);
      await deleteApiKey(selectedKey.id);
      setApiKeys(apiKeys.filter(key => key.id !== selectedKey.id));
      handleDeleteDialogClose();
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError('Failed to delete API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeactivateApiKey = async (apiKey) => {
    try {
      setLoading(true);
      const updatedKey = await deactivateApiKey(apiKey.id);
      setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
    } catch (err) {
      console.error('Error deactivating API key:', err);
      setError('Failed to deactivate API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey.key)
      .then(() => {
        setCopySuccess(`Copied ${apiKey.name} to clipboard!`);
        setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
      });
  };
  
  if (loading && apiKeys.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          API Keys
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
        >
          Create New Key
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {copySuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {copySuccess}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        {apiKeys.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No API Keys Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first API key to integrate with the ProbeOps platform.
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleCreateDialogOpen}
            >
              Create API Key
            </Button>
          </Box>
        ) : (
          <List>
            {apiKeys.map((apiKey) => (
              <React.Fragment key={apiKey.id}>
                <ListItem className="api-key-item">
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {apiKey.name}
                        {!apiKey.is_active && (
                          <Chip 
                            label="Inactive" 
                            size="small" 
                            color="error" 
                            sx={{ ml: 1 }}
                          />
                        )}
                        {apiKey.expires_at && (
                          <Chip 
                            label={`Expires: ${new Date(apiKey.expires_at).toLocaleDateString()}`}
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Created: {new Date(apiKey.created_at).toLocaleString()}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <span className="api-key-value">{apiKey.key}</span>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="copy" 
                      onClick={() => handleCopyApiKey(apiKey)}
                      title="Copy API Key"
                    >
                      <CopyIcon />
                    </IconButton>
                    {apiKey.is_active && (
                      <IconButton 
                        edge="end" 
                        aria-label="deactivate" 
                        onClick={() => handleDeactivateApiKey(apiKey)}
                        title="Deactivate API Key"
                        sx={{ ml: 1 }}
                      >
                        <BlockIcon />
                      </IconButton>
                    )}
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleDeleteDialogOpen(apiKey)}
                      title="Delete API Key"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Create API Key Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCreateDialogClose}>
        <DialogTitle>Create New API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            API keys are used to authenticate requests to the ProbeOps API. Choose a descriptive name and expiration period.
          </DialogContentText>
          
          {formErrors.submit && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {formErrors.submit}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                name="name"
                label="API Key Name"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleFormChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="expires-days-label">Expires After</InputLabel>
                <Select
                  labelId="expires-days-label"
                  name="expires_days"
                  value={formData.expires_days}
                  label="Expires After"
                  onChange={handleFormChange}
                >
                  <MenuItem value={30}>30 days</MenuItem>
                  <MenuItem value={60}>60 days</MenuItem>
                  <MenuItem value={90}>90 days</MenuItem>
                  <MenuItem value={180}>180 days</MenuItem>
                  <MenuItem value={365}>1 year</MenuItem>
                  <MenuItem value={0}>Never (not recommended)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateApiKey} 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create API Key'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete API Key?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the API key "{selectedKey?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteApiKey} 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApiKeys;
