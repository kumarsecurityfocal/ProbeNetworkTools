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
  TablePagination,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Storage as StorageIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import { 
  getTableList, 
  getTableData, 
  getTableInfo, 
  executeReadQuery, 
  downloadTableData 
} from '../services/database';

// Table definitions and metadata
const TABLE_DEFINITIONS = {
  users: {
    displayName: 'Users',
    description: 'User accounts in the system',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'username', name: 'Username', type: 'string' },
      { field: 'email', name: 'Email', type: 'string' },
      { field: 'is_active', name: 'Active', type: 'boolean' },
      { field: 'is_admin', name: 'Admin', type: 'boolean' },
      { field: 'created_at', name: 'Created', type: 'datetime' },
      { field: 'email_verified', name: 'Verified', type: 'boolean' },
    ],
    relations: [
      { name: 'subscriptions', table: 'subscriptions', field: 'user_id' }
    ]
  },
  subscriptions: {
    displayName: 'Subscriptions',
    description: 'User subscription information',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'user_id', name: 'User ID', type: 'number', foreign: 'users.id' },
      { field: 'tier_id', name: 'Tier ID', type: 'number', foreign: 'subscription_tiers.id' },
      { field: 'is_active', name: 'Active', type: 'boolean' },
      { field: 'start_date', name: 'Start Date', type: 'datetime' },
      { field: 'end_date', name: 'End Date', type: 'datetime' },
      { field: 'created_at', name: 'Created', type: 'datetime' },
      { field: 'updated_at', name: 'Updated', type: 'datetime' },
    ],
    relations: [
      { name: 'user', table: 'users', field: 'id', foreign_key: 'user_id' },
      { name: 'tier', table: 'subscription_tiers', field: 'id', foreign_key: 'tier_id' }
    ]
  },
  subscription_tiers: {
    displayName: 'Subscription Tiers',
    description: 'Available subscription plans',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'name', name: 'Name', type: 'string' },
      { field: 'description', name: 'Description', type: 'string' },
      { field: 'price', name: 'Price', type: 'number' },
      { field: 'max_probes', name: 'Max Probes', type: 'number' },
      { field: 'max_api_keys', name: 'Max API Keys', type: 'number' },
      { field: 'max_rate', name: 'Rate Limit', type: 'number' },
      { field: 'features', name: 'Features', type: 'json' },
    ],
    relations: [
      { name: 'subscriptions', table: 'subscriptions', field: 'tier_id' }
    ]
  },
  probe_nodes: {
    displayName: 'Probe Nodes',
    description: 'Network probe nodes',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'node_uuid', name: 'UUID', type: 'string' },
      { field: 'name', name: 'Name', type: 'string' },
      { field: 'region', name: 'Region', type: 'string' },
      { field: 'is_active', name: 'Active', type: 'boolean' },
      { field: 'status', name: 'Status', type: 'string' },
      { field: 'last_heartbeat', name: 'Last Heartbeat', type: 'datetime' },
      { field: 'created_at', name: 'Created', type: 'datetime' },
      { field: 'updated_at', name: 'Updated', type: 'datetime' },
    ]
  },
  diagnostics: {
    displayName: 'Diagnostics',
    description: 'Network diagnostic results',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'user_id', name: 'User ID', type: 'number', foreign: 'users.id' },
      { field: 'tool', name: 'Tool', type: 'string' },
      { field: 'target', name: 'Target', type: 'string' },
      { field: 'status', name: 'Status', type: 'string' },
      { field: 'created_at', name: 'Created', type: 'datetime' },
      { field: 'result', name: 'Result', type: 'json' },
    ]
  },
  api_keys: {
    displayName: 'API Keys',
    description: 'User API keys',
    columns: [
      { field: 'id', name: 'ID', type: 'number', primary: true },
      { field: 'user_id', name: 'User ID', type: 'number', foreign: 'users.id' },
      { field: 'name', name: 'Name', type: 'string' },
      { field: 'key_prefix', name: 'Key Prefix', type: 'string' },
      { field: 'is_active', name: 'Active', type: 'boolean' },
      { field: 'created_at', name: 'Created', type: 'datetime' },
      { field: 'expires_at', name: 'Expires', type: 'datetime' },
    ]
  }
};

// Format value based on column type
const formatValue = (value, columnType) => {
  if (value === null || value === undefined) return '—';
  
  switch (columnType) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'datetime':
      return new Date(value).toLocaleString();
    case 'json':
      return typeof value === 'object' 
        ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
        : value;
    default:
      return String(value);
  }
};

// DatabaseExplorer Component
const DatabaseExplorer = () => {
  // State
  const [availableTables, setAvailableTables] = useState(Object.keys(TABLE_DEFINITIONS));
  const [selectedTable, setSelectedTable] = useState('users');
  const [tableData, setTableData] = useState([]);
  const [tableInfo, setTableInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [filterQuery, setFilterQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Load tables on mount
  useEffect(() => {
    fetchTableList();
  }, []);

  // Load data when table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
      fetchTableInfo();
    }
  }, [selectedTable, page, rowsPerPage]);

  // Fetch list of available tables
  const fetchTableList = async () => {
    try {
      const tables = await getTableList();
      setAvailableTables(tables);
    } catch (error) {
      console.error('Error fetching table list:', error);
      // Fall back to predefined tables
      setAvailableTables(Object.keys(TABLE_DEFINITIONS));
    }
  };

  // Fetch table data with pagination
  const fetchTableData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTableData(selectedTable, {
        page,
        limit: rowsPerPage,
        filter: filterQuery || undefined,
        cache: lastRefreshed ? lastRefreshed.getTime() : undefined
      });
      
      setTableData(result.rows);
      setTotalRows(result.total);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error(`Error fetching ${selectedTable} data:`, error);
      setError(`Failed to load table data: ${error.message}`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch table information
  const fetchTableInfo = async () => {
    try {
      const info = await getTableInfo(selectedTable);
      setTableInfo(info);
    } catch (error) {
      console.error(`Error fetching ${selectedTable} info:`, error);
    }
  };

  // Handle table change
  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    setPage(0);
    setFilterQuery('');
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (event) => {
    setFilterQuery(event.target.value);
  };

  // Apply filter
  const applyFilter = () => {
    setPage(0);
    fetchTableData();
  };

  // Download table data
  const handleDownload = async () => {
    try {
      await downloadTableData(selectedTable, {
        filter: filterQuery || undefined,
        format: 'csv'
      });
    } catch (error) {
      console.error(`Error downloading ${selectedTable} data:`, error);
      setError(`Failed to download table data: ${error.message}`);
    }
  };

  // View row details
  const handleViewDetails = (row) => {
    setSelectedRow(row);
    setShowDetails(true);
  };

  // Get table definition
  const getTableDefinition = () => {
    return TABLE_DEFINITIONS[selectedTable] || {
      displayName: selectedTable,
      description: 'Database table',
      columns: []
    };
  };

  // Get visible columns
  const getVisibleColumns = () => {
    const tableDef = getTableDefinition();
    return tableDef.columns || [];
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <StorageIcon sx={{ mr: 1 }} /> Database Explorer
        <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
          {lastRefreshed && `Last refreshed: ${lastRefreshed.toLocaleTimeString()}`}
        </Typography>
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Table</InputLabel>
              <Select
                value={selectedTable}
                label="Table"
                onChange={handleTableChange}
              >
                {availableTables.map((table) => (
                  <MenuItem key={table} value={table}>
                    {TABLE_DEFINITIONS[table]?.displayName || table}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={5}>
            <TextField
              label="Filter"
              placeholder="column:value e.g. is_active:true"
              size="small"
              fullWidth
              value={filterQuery}
              onChange={handleFilterChange}
              onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                startIcon={<FilterIcon />}
                onClick={applyFilter}
              >
                Filter
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchTableData}
              >
                Refresh
              </Button>
              <Tooltip title="Download as CSV">
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        
        {getTableDefinition().description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {getTableDefinition().description}
          </Typography>
        )}
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Actions</TableCell>
              {getVisibleColumns().map((column) => (
                <TableCell key={column.field}>
                  {column.name}
                  {column.primary && <Chip size="small" label="PK" sx={{ ml: 1, height: 16 }} />}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={getVisibleColumns().length + 1} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : tableData.length > 0 ? (
              tableData.map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(row)}
                      title="View Details"
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  {getVisibleColumns().map((column) => (
                    <TableCell key={column.field}>
                      {formatValue(row[column.field], column.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={getVisibleColumns().length + 1} align="center">
                  No data found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalRows}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      
      {/* Row Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Record Details
          <IconButton
            aria-label="close"
            onClick={() => setShowDetails(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Typography variant="h6">×</Typography>
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRow && (
            <Grid container spacing={2}>
              {getVisibleColumns().map((column) => (
                <Grid item xs={12} sm={6} key={column.field}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        {column.name}
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                        {column.type === 'json' && typeof selectedRow[column.field] === 'object' ? (
                          <pre style={{ margin: 0, overflow: 'auto', maxHeight: 150 }}>
                            {JSON.stringify(selectedRow[column.field], null, 2)}
                          </pre>
                        ) : (
                          formatValue(selectedRow[column.field], column.type)
                        )}
                      </Typography>
                      {column.foreign && (
                        <Typography variant="caption" color="primary">
                          References: {column.foreign}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseExplorer;