import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
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
  DialogActions,
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Checkbox,
  Pagination,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  HourglassTop as HourglassTopIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { 
  getScheduledProbes, 
  getScheduledProbeById, 
  createScheduledProbe, 
  updateScheduledProbe, 
  deleteScheduledProbe, 
  pauseScheduledProbe, 
  resumeScheduledProbe, 
  getProbeResults, 
  bulkPauseProbes, 
  bulkResumeProbes, 
  bulkDeleteProbes 
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Enable relative time formatting
dayjs.extend(relativeTime);

// Tools options (same as in Diagnostics page)
const toolOptions = [
  { value: 'ping', label: 'Ping', tooltip: 'Test network connectivity to a target' },
  { value: 'traceroute', label: 'Traceroute', tooltip: 'Trace network path to a target' },
  { value: 'dns_lookup', label: 'DNS Lookup', tooltip: 'Lookup DNS records for a domain' },
  { value: 'whois', label: 'WHOIS Lookup', tooltip: 'Lookup domain registration info' },
  { value: 'port_check', label: 'Port Check', tooltip: 'Check if a specific port is open' },
  { value: 'http_request', label: 'HTTP(S) Request', tooltip: 'Test HTTP/HTTPS requests' }
];

// Fixed interval options as specified
const intervalOptions = [
  { value: 5, label: '5 Minutes', minutes: 5 },
  { value: 15, label: '15 Minutes', minutes: 15 },
  { value: 60, label: '1 Hour', minutes: 60 },
  { value: 1440, label: '1 Day', minutes: 1440 }
];

function ScheduledProbes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [probes, setProbes] = useState([]);
  const [selectedProbe, setSelectedProbe] = useState(null);
  const [probeResults, setProbeResults] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openResultsDialog, setOpenResultsDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tool: 'ping',
    target: '',
    interval_minutes: 60, // Default to 1 hour
    is_active: true,
    alert_on_failure: false,
    alert_on_threshold: false,
    threshold_value: null
  });
  const [selectedInterval, setSelectedInterval] = useState(60); // Default to 1 hour
  const [selectedProbes, setSelectedProbes] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [resultPagination, setResultPagination] = useState({
    page: 1,
    limit: 10,
    count: 0
  });
  const [selectedTab, setSelectedTab] = useState(0);

  // Fetch all scheduled probes
  const fetchProbes = async () => {
    setLoading(true);
    try {
      const data = await getScheduledProbes();
      setProbes(data);
    } catch (error) {
      showSnackbar(`Error fetching probes: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch probe results
  const fetchProbeResults = async (probeId) => {
    try {
      const params = {
        skip: (resultPagination.page - 1) * resultPagination.limit,
        limit: resultPagination.limit
      };
      const data = await getProbeResults(probeId, params);
      setProbeResults(data);
    } catch (error) {
      showSnackbar(`Error fetching probe results: ${error.message}`, 'error');
    }
  };

  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Open create/edit dialog
  const handleOpenDialog = (mode, probe = null) => {
    setFormMode(mode);
    
    if (mode === 'edit' && probe) {
      // Set the selected interval
      setSelectedInterval(probe.interval_minutes);
      setFormData({
        name: probe.name,
        description: probe.description || '',
        tool: probe.tool,
        target: probe.target,
        interval_minutes: probe.interval_minutes,
        is_active: probe.is_active,
        alert_on_failure: probe.alert_on_failure,
        alert_on_threshold: probe.alert_on_threshold,
        threshold_value: probe.threshold_value
      });
    } else {
      // Default values for create
      setSelectedInterval(60); // Default to 1 hour
      setFormData({
        name: '',
        description: '',
        tool: 'ping',
        target: '',
        interval_minutes: 60,
        is_active: true,
        alert_on_failure: false,
        alert_on_threshold: false,
        threshold_value: null
      });
    }
    
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle interval selection change
  const handleIntervalChange = (e) => {
    const minutes = Number(e.target.value);
    setSelectedInterval(minutes);
    
    setFormData({
      ...formData,
      interval_minutes: minutes
    });
  };

  // Submit form to create/edit probe
  const handleSubmit = async () => {
    try {
      if (formMode === 'create') {
        const newProbe = await createScheduledProbe(formData);
        setProbes([newProbe, ...probes]);
        showSnackbar('Scheduled probe created successfully');
      } else {
        const updatedProbe = await updateScheduledProbe(selectedProbe.id, formData);
        setProbes(probes.map(p => p.id === updatedProbe.id ? updatedProbe : p));
        showSnackbar('Scheduled probe updated successfully');
      }
      handleCloseDialog();
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };

  // Delete a probe
  const handleDelete = async () => {
    try {
      await deleteScheduledProbe(selectedProbe.id);
      setProbes(probes.filter(p => p.id !== selectedProbe.id));
      showSnackbar('Scheduled probe deleted successfully');
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  // Pause a probe
  const handlePause = async (probe) => {
    try {
      const updatedProbe = await pauseScheduledProbe(probe.id);
      setProbes(probes.map(p => p.id === updatedProbe.id ? updatedProbe : p));
      showSnackbar('Scheduled probe paused successfully');
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };

  // Resume a probe
  const handleResume = async (probe) => {
    try {
      const updatedProbe = await resumeScheduledProbe(probe.id);
      setProbes(probes.map(p => p.id === updatedProbe.id ? updatedProbe : p));
      showSnackbar('Scheduled probe resumed successfully');
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };

  // Bulk pause selected probes
  const handleBulkPause = async () => {
    try {
      await bulkPauseProbes(selectedProbes);
      fetchProbes(); // Refresh the list
      showSnackbar('Selected probes paused successfully');
      setSelectedProbes([]);
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };

  // Bulk resume selected probes
  const handleBulkResume = async () => {
    try {
      await bulkResumeProbes(selectedProbes);
      fetchProbes(); // Refresh the list
      showSnackbar('Selected probes resumed successfully');
      setSelectedProbes([]);
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };

  // Bulk delete selected probes
  const handleBulkDelete = async () => {
    try {
      await bulkDeleteProbes(selectedProbes);
      fetchProbes(); // Refresh the list
      showSnackbar('Selected probes deleted successfully');
      setSelectedProbes([]);
    } catch (error) {
      showSnackbar(`Error: ${error.message}`, 'error');
    } finally {
      setOpenBulkDeleteDialog(false);
    }
  };

  // View probe results
  const handleViewResults = async (probe) => {
    setSelectedProbe(probe);
    setOpenResultsDialog(true);
    await fetchProbeResults(probe.id);
  };

  // Handle result pagination change
  const handleResultPageChange = (event, value) => {
    setResultPagination({
      ...resultPagination,
      page: value
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Toggle probe selection for bulk operations
  const handleSelectProbe = (probeId) => {
    if (selectedProbes.includes(probeId)) {
      setSelectedProbes(selectedProbes.filter(id => id !== probeId));
    } else {
      setSelectedProbes([...selectedProbes, probeId]);
    }
  };

  // Select all probes
  const handleSelectAll = () => {
    if (selectedProbes.length === probes.length) {
      setSelectedProbes([]);
    } else {
      setSelectedProbes(probes.map(p => p.id));
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return dateString ? dayjs(dateString).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
  };

  // Get time since for display
  const getTimeSince = (dateString) => {
    return dateString ? dayjs(dateString).fromNow() : 'N/A';
  };

  // Format probe status
  const getProbeStatus = (probe) => {
    if (!probe.is_active) return 'Paused';
    return 'Active';
  };

  // Get probe status color
  const getProbeStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format last result status
  const getLastResultStatus = (probe) => {
    if (!probe.last_result) return 'N/A';
    return probe.last_result.status === 'success' ? 'Success' : 'Failure';
  };

  // Get last result status color
  const getLastResultStatusColor = (status) => {
    switch (status) {
      case 'Success':
        return 'success';
      case 'Failure':
        return 'error';
      default:
        return 'default';
    }
  };

  // Load probes on component mount
  useEffect(() => {
    fetchProbes();
  }, []);

  // Fetch probe results when probe or pagination changes
  useEffect(() => {
    if (selectedProbe && openResultsDialog) {
      fetchProbeResults(selectedProbe.id);
    }
  }, [selectedProbe, resultPagination.page, openResultsDialog]);

  // Check if user can perform bulk operations
  const canPerformBulkOperations = () => {
    return user?.subscription?.tier?.allow_export === true;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Scheduled Probes
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Create New Probe
        </Button>
        
        {selectedProbes.length > 0 && canPerformBulkOperations() && (
          <Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleBulkResume}
              sx={{ mr: 1 }}
            >
              Resume Selected
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={handleBulkPause}
              sx={{ mr: 1 }}
            >
              Pause Selected
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setOpenBulkDeleteDialog(true)}
            >
              Delete Selected
            </Button>
          </Box>
        )}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : probes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No scheduled probes found. Create your first probe to start monitoring.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                {canPerformBulkOperations() && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={probes.length > 0 && selectedProbes.length === probes.length}
                      indeterminate={selectedProbes.length > 0 && selectedProbes.length < probes.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>Name</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Command</TableCell>
                <TableCell>Interval</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell>Last Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {probes.map((probe) => (
                <TableRow key={probe.id}>
                  {canPerformBulkOperations() && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProbes.includes(probe.id)}
                        onChange={() => handleSelectProbe(probe.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{probe.name}</TableCell>
                  <TableCell>{probe.target}</TableCell>
                  <TableCell>
                    {toolOptions.find(t => t.value === probe.tool)?.label || probe.tool}
                  </TableCell>
                  <TableCell>
                    {probe.interval_minutes < 60 
                      ? `${probe.interval_minutes} minutes` 
                      : probe.interval_minutes < 1440 
                        ? `${probe.interval_minutes / 60} hours` 
                        : `${probe.interval_minutes / 1440} days`}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getProbeStatus(probe)} 
                      color={getProbeStatusColor(getProbeStatus(probe))}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {probe.last_run ? getTimeSince(probe.last_run) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getLastResultStatus(probe)}
                      color={getLastResultStatusColor(getLastResultStatus(probe))}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Results">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleViewResults(probe)}
                        size="small"
                      >
                        <AssessmentIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenDialog('edit', probe)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {probe.is_active ? (
                      <Tooltip title="Pause">
                        <IconButton 
                          color="warning" 
                          onClick={() => handlePause(probe)}
                          size="small"
                        >
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Resume">
                        <IconButton 
                          color="success" 
                          onClick={() => handleResume(probe)}
                          size="small"
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton 
                        color="error" 
                        onClick={() => {
                          setSelectedProbe(probe);
                          setOpenDeleteDialog(true);
                        }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Create/Edit Probe Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === 'create' ? 'Create New Scheduled Probe' : 'Edit Scheduled Probe'}
        </DialogTitle>
        <DialogContent>
          <Tabs 
            value={selectedTab} 
            onChange={handleTabChange} 
            sx={{ mb: 2 }}
          >
            <Tab label="Basic Information" />
            <Tab label="Schedule Settings" />
            <Tab label="Notification Settings" />
          </Tabs>
          
          {/* Basic Information Tab */}
          {selectedTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Probe Name"
                  value={formData.name}
                  onChange={handleFormChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleFormChange}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Command Type</InputLabel>
                  <Select
                    name="tool"
                    value={formData.tool}
                    onChange={handleFormChange}
                    label="Command Type"
                  >
                    {toolOptions.map((tool) => (
                      <MenuItem key={tool.value} value={tool.value}>
                        {tool.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="target"
                  label="Target"
                  value={formData.target}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  placeholder={formData.tool === 'port_check' ? 'example.com:80' : 'example.com'}
                  helperText={
                    formData.tool === 'port_check' 
                      ? 'Enter domain/IP and port (e.g., example.com:80)' 
                      : formData.tool === 'http_request'
                        ? 'Enter URL with protocol (e.g., https://example.com)'
                        : 'Enter domain or IP address'
                  }
                />
              </Grid>
            </Grid>
          )}
          
          {/* Schedule Settings Tab */}
          {selectedTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Interval</InputLabel>
                  <Select
                    value={selectedInterval}
                    onChange={handleIntervalChange}
                    label="Interval"
                  >
                    {intervalOptions.map((option) => (
                      <MenuItem key={option.value} value={option.minutes}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Probe will run at this interval
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleFormChange}
                      color="primary"
                    />
                  }
                  label="Active (start running immediately)"
                />
              </Grid>
            </Grid>
          )}
          
          {/* Notification Settings Tab */}
          {selectedTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="alert_on_failure"
                      checked={formData.alert_on_failure}
                      onChange={handleFormChange}
                      color="primary"
                    />
                  }
                  label="Alert on Failure"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="alert_on_threshold"
                      checked={formData.alert_on_threshold}
                      onChange={handleFormChange}
                      color="primary"
                    />
                  }
                  label="Alert on Performance Threshold"
                />
              </Grid>
              {formData.alert_on_threshold && (
                <Grid item xs={12}>
                  <TextField
                    name="threshold_value"
                    type="number"
                    label="Threshold Value (ms)"
                    value={formData.threshold_value || ''}
                    onChange={handleFormChange}
                    fullWidth
                    inputProps={{ min: 1 }}
                    helperText="Alert when response time exceeds this value (in milliseconds)"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Note: Additional notification settings like email alerts are available on Standard and Enterprise plans.
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.target}
          >
            {formMode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Results Dialog */}
      <Dialog 
        open={openResultsDialog} 
        onClose={() => setOpenResultsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Probe Results: {selectedProbe?.name}
        </DialogTitle>
        <DialogContent>
          {probeResults.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No results found for this probe.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Showing the most recent probe results
                </Typography>
              </Box>
              {probeResults.map((result) => (
                <Card key={result.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">
                        {result.status === 'success' ? (
                          <CheckIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                        ) : (
                          <ErrorIcon color="error" sx={{ verticalAlign: 'middle', mr: 1 }} />
                        )}
                        {result.status === 'success' ? 'Success' : 'Failure'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(result.created_at)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Execution Time: {result.execution_time}ms
                    </Typography>
                    <Paper sx={{ p: 1, backgroundColor: '#f5f5f5' }}>
                      <Typography 
                        variant="body2" 
                        component="pre" 
                        sx={{ 
                          whiteSpace: 'pre-wrap', 
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        }}
                      >
                        {result.result}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              ))}
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(resultPagination.count / resultPagination.limit)}
                  page={resultPagination.page}
                  onChange={handleResultPageChange}
                  color="primary"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResultsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the probe "{selectedProbe?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={openBulkDeleteDialog} onClose={() => setOpenBulkDeleteDialog(false)}>
        <DialogTitle>Confirm Bulk Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedProbes.length} selected probes? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkDeleteDialog(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleBulkDelete}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ScheduledProbes;