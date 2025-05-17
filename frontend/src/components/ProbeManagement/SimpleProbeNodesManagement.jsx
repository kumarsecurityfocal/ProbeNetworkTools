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
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Check as CheckIcon,
  ErrorOutline as ErrorIcon,
  SettingsRemote as SettingsRemoteIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

const SimpleProbeNodesManagement = () => {
  const { api } = useApi();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nodeEditForm, setNodeEditForm] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initialize dayjs relativeTime plugin
  dayjs.extend(relativeTime);

  // Load nodes on mount
  useEffect(() => {
    fetchNodes();
  }, []);

  // Fetch all probe nodes
  const fetchNodes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/probe-nodes', {
        params: { skip: 0, limit: 100, active_only: false }
      });
      
      setNodes(response.data || []);
    } catch (err) {
      console.error('Error fetching probe nodes:', err);
      setError('Failed to load probe nodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for relative time
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return dayjs(dateString).fromNow();
  };

  // Get color for status chip
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'registered':
        return 'info';
      case 'deactivated':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Format load as percentage
  const formatLoad = (load) => {
    if (load === undefined || load === null) return 'N/A';
    return `${Math.round(load * 100)}%`;
  };

  // Handle edit button click
  const handleEditNode = (node) => {
    setSelectedNode(node);
    setNodeEditForm({
      name: node.name || '',
      description: node.description || '',
      is_active: node.is_active !== false
    });
    setEditDialogOpen(true);
  };

  // Handle saving node edits
  const handleSaveEdits = async () => {
    try {
      await api.patch(`/probe-nodes/${selectedNode.node_uuid}`, nodeEditForm);
      showNotification('Node updated successfully', 'success');
      setEditDialogOpen(false);
      fetchNodes();
    } catch (err) {
      console.error('Error updating node:', err);
      showNotification('Failed to update node', 'error');
    }
  };

  // Handle deactivating a node
  const handleDeactivateNode = async (node) => {
    if (window.confirm(`Are you sure you want to deactivate the node "${node.name}"?`)) {
      try {
        await api.post(`/probe-nodes/${node.node_uuid}/deactivate`);
        showNotification('Node deactivated successfully', 'success');
        fetchNodes();
      } catch (err) {
        console.error('Error deactivating node:', err);
        showNotification('Failed to deactivate node', 'error');
      }
    }
  };

  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsRemoteIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Probe Nodes</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchNodes}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : nodes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No probe nodes found. Use the "Generate Tokens" tab to create tokens for new nodes.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Load</TableCell>
                <TableCell>Last Heartbeat</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.node_uuid} hover>
                  <TableCell>
                    <Typography variant="body2">{node.name || 'Unnamed Node'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {node.node_uuid}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={node.status || 'unknown'}
                      color={getStatusColor(node.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {node.region || 'N/A'}
                    {node.zone && <Typography variant="caption" display="block">{node.zone}</Typography>}
                  </TableCell>
                  <TableCell>{formatLoad(node.current_load)}</TableCell>
                  <TableCell>{formatDate(node.last_heartbeat)}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit Node">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditNode(node)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {node.is_active !== false && (
                      <Tooltip title="Deactivate Node">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeactivateNode(node)}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Node Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Probe Node</DialogTitle>
        <DialogContent>
          <TextField
            label="Node Name"
            value={nodeEditForm.name}
            onChange={(e) => setNodeEditForm({ ...nodeEditForm, name: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={nodeEditForm.description}
            onChange={(e) => setNodeEditForm({ ...nodeEditForm, description: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={nodeEditForm.is_active}
                onChange={(e) => setNodeEditForm({ ...nodeEditForm, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdits} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SimpleProbeNodesManagement;