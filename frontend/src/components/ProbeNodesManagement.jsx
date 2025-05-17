import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  SettingsRemote as SettingsRemoteIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon,
  ContentCopy as ContentCopyIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { getProbeNodes, getProbeNodeDetails, updateProbeNode, deactivateProbeNode, createRegistrationToken, getRegistrationTokens, revokeRegistrationToken } from '../services/probeNodes';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import sharedStyles from '../theme/sharedStyles';

const ProbeNodesManagement = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedNode, setExpandedNode] = useState(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [nodeEditDialogOpen, setNodeEditDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    region: '',
    status: '',
    activeOnly: false
  });
  const [tokenForm, setTokenForm] = useState({
    description: '',
    expiryHours: 24,
    region: ''
  });
  const [newToken, setNewToken] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [nodeEditForm, setNodeEditForm] = useState({
    name: '',
    priority: 0,
    status: '',
    admin_notes: '',
    is_active: true
  });
  const [registrationTokens, setRegistrationTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokenFilters, setTokenFilters] = useState({
    includeExpired: false,
    includeUsed: false
  });

  // Load probe nodes on component mount
  useEffect(() => {
    fetchProbeNodes();
    fetchRegistrationTokens();
  }, []);

  // Fetch probe nodes with optional filters
  const fetchProbeNodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProbeNodes(filters);
      setNodes(data);
    } catch (err) {
      setError('Failed to load probe nodes. Please try again.');
      console.error('Error fetching probe nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchProbeNodes();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      region: '',
      status: '',
      activeOnly: false
    });
  };

  // Toggle node expansion to show details
  const toggleNodeExpansion = async (nodeUuid) => {
    if (expandedNode === nodeUuid) {
      setExpandedNode(null);
      return;
    }
    
    setExpandedNode(nodeUuid);
    try {
      const details = await getProbeNodeDetails(nodeUuid);
      setSelectedNode(details);
    } catch (err) {
      showNotification('Failed to load node details', 'error');
    }
  };

  // Open edit dialog for a node
  const handleEditNode = (node) => {
    setNodeEditForm({
      name: node.name,
      priority: node.priority || 1,
      status: node.status,
      admin_notes: node.admin_notes || '',
      is_active: node.is_active
    });
    setSelectedNode(node);
    setNodeEditDialogOpen(true);
  };

  // Save node edits
  const saveNodeEdits = async () => {
    try {
      await updateProbeNode(selectedNode.node_uuid, nodeEditForm);
      showNotification('Node updated successfully', 'success');
      setNodeEditDialogOpen(false);
      fetchProbeNodes();
    } catch (err) {
      showNotification('Failed to update node', 'error');
    }
  };

  // Deactivate a node
  const handleDeactivateNode = async (nodeUuid, nodeName) => {
    if (window.confirm(`Are you sure you want to deactivate node "${nodeName}"? This will prevent it from processing any new diagnostics.`)) {
      try {
        await deactivateProbeNode(nodeUuid);
        showNotification('Node deactivated successfully', 'success');
        fetchProbeNodes();
      } catch (err) {
        showNotification('Failed to deactivate node', 'error');
      }
    }
  };

  // Open token creation dialog
  const handleOpenTokenDialog = () => {
    setTokenForm({
      description: '',
      expiryHours: 24,
      region: ''
    });
    setNewToken(null);
    setTokenDialogOpen(true);
  };

  // Handle token form input changes
  const handleTokenFormChange = (e) => {
    const { name, value } = e.target;
    setTokenForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create a new registration token
  const handleCreateToken = async () => {
    try {
      const result = await createRegistrationToken(tokenForm);
      setNewToken(result);
      showNotification('Registration token created successfully', 'success');
    } catch (err) {
      showNotification('Failed to create registration token', 'error');
    }
  };

  // Copy token to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard', 'info');
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
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Format load as percentage
  const formatLoad = (load) => {
    return `${Math.round(load * 100)}%`;
  };

  // Calculate status color
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

  // Initialize dayjs relativeTime plugin
  dayjs.extend(relativeTime);

  // Fetch registration tokens
  const fetchRegistrationTokens = async () => {
    setTokensLoading(true);
    try {
      const { includeExpired, includeUsed } = tokenFilters;
      const data = await getRegistrationTokens(includeExpired, includeUsed);
      setRegistrationTokens(data || []);
    } catch (err) {
      showNotification('Failed to load registration tokens. Please try again.', 'error');
      console.error('Error fetching registration tokens:', err);
    } finally {
      setTokensLoading(false);
    }
  };

  // Handle token filter changes
  const handleTokenFilterChange = (filterName) => {
    setTokenFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  // Apply token filters
  const applyTokenFilters = () => {
    fetchRegistrationTokens();
  };

  // Revoke/delete a token
  const handleRevokeToken = async (tokenId, description) => {
    if (window.confirm(`Are you sure you want to revoke the token "${description}"? This cannot be undone.`)) {
      try {
        await revokeRegistrationToken(tokenId);
        showNotification('Token revoked successfully', 'success');
        fetchRegistrationTokens();
      } catch (err) {
        showNotification('Failed to revoke token', 'error');
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return dayjs(dateString).fromNow();
  };

  return (
    <Box sx={{ ...sharedStyles.container }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        <SettingsRemoteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Probe Node Management
      </Typography>
      
      <Paper sx={{ ...sharedStyles.paper, mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Filter Nodes</Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={fetchProbeNodes}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleOpenTokenDialog}
            >
              Create Registration Token
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Region</InputLabel>
              <Select
                name="region"
                value={filters.region}
                onChange={handleFilterChange}
                label="Region"
              >
                <MenuItem value="">All Regions</MenuItem>
                <MenuItem value="us-east">US East</MenuItem>
                <MenuItem value="us-west">US West</MenuItem>
                <MenuItem value="eu-west">EU West</MenuItem>
                <MenuItem value="ap-south">Asia Pacific South</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="registered">Registered</MenuItem>
                <MenuItem value="deactivated">Deactivated</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<FilterListIcon />}
                onClick={applyFilters}
              >
                Apply Filters
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={sharedStyles.paper}>
          <Table>
            <TableHead sx={sharedStyles.tableHead}>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Load</TableCell>
                <TableCell>Last Heartbeat</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      No probe nodes found. Create a registration token to add new nodes.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nodes.map((node) => (
                  <React.Fragment key={node.node_uuid}>
                    <TableRow 
                      hover
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                    >
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleNodeExpansion(node.node_uuid)}>
                          {expandedNode === node.node_uuid ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{node.name}</TableCell>
                      <TableCell>{node.region}{node.zone ? ` (${node.zone})` : ''}</TableCell>
                      <TableCell>
                        <Chip
                          label={node.status}
                          color={getStatusColor(node.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatLoad(node.current_load)}</TableCell>
                      <TableCell>{formatDate(node.last_heartbeat)}</TableCell>
                      <TableCell>
                        <Tooltip title="Edit Node">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNode(node);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate Node">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateNode(node.node_uuid, node.name);
                            }}
                            disabled={!node.is_active}
                          >
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {expandedNode === node.node_uuid && selectedNode && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', py: 0 }}>
                          <Box sx={{ p: 2 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>Node Details</Typography>
                                    <Grid container spacing={1}>
                                      <Grid item xs={4}><Typography variant="body2" color="textSecondary">Node ID:</Typography></Grid>
                                      <Grid item xs={8}><Typography variant="body2">{selectedNode.node_uuid}</Typography></Grid>
                                      
                                      <Grid item xs={4}><Typography variant="body2" color="textSecondary">Hostname:</Typography></Grid>
                                      <Grid item xs={8}><Typography variant="body2">{selectedNode.hostname}</Typography></Grid>
                                      
                                      <Grid item xs={4}><Typography variant="body2" color="textSecondary">Version:</Typography></Grid>
                                      <Grid item xs={8}><Typography variant="body2">{selectedNode.version || 'Unknown'}</Typography></Grid>
                                      
                                      <Grid item xs={4}><Typography variant="body2" color="textSecondary">Priority:</Typography></Grid>
                                      <Grid item xs={8}><Typography variant="body2">{selectedNode.priority}</Typography></Grid>
                                      
                                      <Grid item xs={4}><Typography variant="body2" color="textSecondary">Created:</Typography></Grid>
                                      <Grid item xs={8}><Typography variant="body2">{formatDate(selectedNode.created_at)}</Typography></Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                                    <Grid container spacing={1}>
                                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Current Load:</Typography></Grid>
                                      <Grid item xs={6}><Typography variant="body2">{formatLoad(selectedNode.current_load)}</Typography></Grid>
                                      
                                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Avg Response Time:</Typography></Grid>
                                      <Grid item xs={6}><Typography variant="body2">{selectedNode.avg_response_time.toFixed(2)} ms</Typography></Grid>
                                      
                                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Error Count:</Typography></Grid>
                                      <Grid item xs={6}><Typography variant="body2">{selectedNode.error_count}</Typography></Grid>
                                      
                                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Total Probes:</Typography></Grid>
                                      <Grid item xs={6}><Typography variant="body2">{selectedNode.total_probes_executed}</Typography></Grid>
                                      
                                      <Grid item xs={6}><Typography variant="body2" color="textSecondary">Max Concurrent:</Typography></Grid>
                                      <Grid item xs={6}><Typography variant="body2">{selectedNode.max_concurrent_probes}</Typography></Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>Supported Diagnostic Tools</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                      {selectedNode.supported_tools && Object.entries(selectedNode.supported_tools).map(([tool, supported]) => (
                                        supported ? (
                                          <Chip 
                                            key={tool} 
                                            label={tool} 
                                            color="primary" 
                                            size="small" 
                                            variant="outlined" 
                                          />
                                        ) : null
                                      ))}
                                    </Box>
                                    {(!selectedNode.supported_tools || Object.values(selectedNode.supported_tools).filter(Boolean).length === 0) && (
                                      <Typography variant="body2" color="textSecondary">No tools specified</Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                              {selectedNode.admin_notes && (
                                <Grid item xs={12}>
                                  <Card variant="outlined">
                                    <CardContent>
                                      <Typography variant="h6" gutterBottom>Admin Notes</Typography>
                                      <Typography variant="body2">{selectedNode.admin_notes}</Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Registration Tokens Section */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        <VpnKeyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Registration Tokens
      </Typography>
      <Paper sx={{ ...sharedStyles.paper, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={tokenFilters.includeExpired}
                  onChange={() => handleTokenFilterChange('includeExpired')}
                  size="small"
                />
              }
              label="Show Expired"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={tokenFilters.includeUsed}
                  onChange={() => handleTokenFilterChange('includeUsed')}
                  size="small"
                />
              }
              label="Show Used"
            />
          </Box>
          <Button 
            variant="outlined" 
            size="small"
            onClick={applyTokenFilters}
            startIcon={<FilterListIcon />}
          >
            Apply Filters
          </Button>
        </Box>
        
        {tokensLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : registrationTokens.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No registration tokens found
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={sharedStyles.tableHead}>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Token</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrationTokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>{token.description}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: '150px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace' 
                      }}>
                        {token.token ? token.token.substring(0, 8) + '...' : 'N/A'}
                        {token.token && (
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              navigator.clipboard.writeText(token.token);
                              showNotification('Token copied to clipboard', 'success');
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>{token.region || 'Global'}</TableCell>
                    <TableCell>{formatDate(token.created_at)}</TableCell>
                    <TableCell>{formatDate(token.expires_at)}</TableCell>
                    <TableCell>
                      {token.is_used ? (
                        <Chip 
                          size="small" 
                          label="Used" 
                          color="primary" 
                          variant="outlined" 
                        />
                      ) : dayjs(token.expires_at).isBefore(dayjs()) ? (
                        <Chip 
                          size="small" 
                          label="Expired" 
                          color="error" 
                          variant="outlined" 
                        />
                      ) : (
                        <Chip 
                          size="small" 
                          label="Active" 
                          color="success" 
                          variant="outlined" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRevokeToken(token.id, token.description)}
                        disabled={token.is_used || dayjs(token.expires_at).isBefore(dayjs())}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Registration Token Dialog */}
      <Dialog 
        open={tokenDialogOpen} 
        onClose={() => setTokenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Registration Token</DialogTitle>
        <DialogContent>
          {newToken ? (
            <Box sx={{ my: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Token created successfully! This token will expire {formatDate(newToken.expires_at)}.
              </Alert>
              <Typography variant="subtitle2" gutterBottom>Registration Token:</Typography>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {newToken.token}
                </Typography>
                <IconButton
                  onClick={() => copyToClipboard(newToken.token)}
                  size="small"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Paper>
              <Typography variant="body2" color="textSecondary">
                Copy this token to use when registering a new probe node. For security reasons, this token will not be shown again.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={tokenForm.description}
                onChange={handleTokenFormChange}
                margin="normal"
                helperText="Enter a description for this token (e.g., 'AWS US-East Node')"
                required
              />
              <TextField
                fullWidth
                label="Expiry Hours"
                name="expiryHours"
                type="number"
                value={tokenForm.expiryHours}
                onChange={handleTokenFormChange}
                margin="normal"
                InputProps={{ inputProps: { min: 1, max: 168 } }}
                helperText="How many hours should this token be valid for (1-168)"
              />
              <TextField
                fullWidth
                label="Intended Region"
                name="region"
                value={tokenForm.region}
                onChange={handleTokenFormChange}
                margin="normal"
                helperText="Optional region code for this node (e.g., 'us-east')"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenDialogOpen(false)}>
            {newToken ? 'Close' : 'Cancel'}
          </Button>
          {!newToken && (
            <Button 
              onClick={handleCreateToken} 
              color="primary" 
              variant="contained"
              disabled={!tokenForm.description}
            >
              Create Token
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Node Edit Dialog */}
      <Dialog 
        open={nodeEditDialogOpen} 
        onClose={() => setNodeEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Node: {selectedNode?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={nodeEditForm.name}
              onChange={(e) => setNodeEditForm({ ...nodeEditForm, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={nodeEditForm.status}
                onChange={(e) => setNodeEditForm({ ...nodeEditForm, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="registered">Registered</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="deactivated">Deactivated</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Priority"
              name="priority"
              type="number"
              value={nodeEditForm.priority}
              onChange={(e) => setNodeEditForm({ ...nodeEditForm, priority: parseInt(e.target.value) })}
              margin="normal"
              InputProps={{ inputProps: { min: 1, max: 10 } }}
              helperText="Priority level (1-10, higher = higher priority)"
            />
            <TextField
              fullWidth
              label="Admin Notes"
              name="admin_notes"
              value={nodeEditForm.admin_notes}
              onChange={(e) => setNodeEditForm({ ...nodeEditForm, admin_notes: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={saveNodeEdits} 
            color="primary" 
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProbeNodesManagement;