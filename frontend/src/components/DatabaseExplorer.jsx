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
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { DataObject, Storage, TableChart, Send } from '@mui/icons-material';
import axios from 'axios';

const DatabaseExplorer = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const [statusInfo, setStatusInfo] = useState({});
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10');
  const [queryResult, setQueryResult] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [queryError, setQueryError] = useState(null);
  const [executingQuery, setExecutingQuery] = useState(false);

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/admin-database');
      console.log('Database info response:', response.data);
      
      setConnected(response.data.connected);
      setTables(response.data.tables || []);
      setStatusInfo({
        status: response.data.status,
        version: response.data.version,
        uptime: response.data.uptime
      });
      
      if (response.data.tables && response.data.tables.length > 0) {
        setSelectedTable(response.data.tables[0].name);
      }
    } catch (err) {
      console.error('Error fetching database info:', err);
      setError('Failed to connect to database. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setExecutingQuery(true);
    setQueryError(null);
    
    try {
      // Validate query is SELECT only
      if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }
      
      const response = await axios.post('/api/admin-database/query', {
        query: sqlQuery
      });
      
      console.log('Query result:', response.data);
      setQueryResult(response.data);
    } catch (err) {
      console.error('Error executing query:', err);
      setQueryError(err.response?.data?.error || err.message || 'Failed to execute query');
      setQueryResult(null);
    } finally {
      setExecutingQuery(false);
    }
  };

  const generateSelectQuery = (tableName) => {
    return `SELECT * FROM ${tableName} LIMIT 10`;
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setSqlQuery(generateSelectQuery(table));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Connecting to database...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }} 
          onClick={fetchDatabaseInfo}
        >
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
          Database Explorer
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Chip 
            label={connected ? "Connected" : "Disconnected"} 
            color={connected ? "success" : "error"} 
            size="small" 
            sx={{ mr: 2 }}
          />
          <Typography variant="body2">
            {statusInfo.status} • {statusInfo.version} • Uptime: {statusInfo.uptime}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle1" gutterBottom>
              <TableChart sx={{ mr: 1, verticalAlign: 'middle' }} />
              Database Tables
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflow: 'auto' }}>
              {tables.map((table) => (
                <Box 
                  key={table.name}
                  sx={{ 
                    p: 1, 
                    cursor: 'pointer',
                    bgcolor: selectedTable === table.name ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 1,
                    mb: 0.5
                  }}
                  onClick={() => handleTableSelect(table.name)}
                >
                  <Typography variant="body2" fontWeight={selectedTable === table.name ? 'bold' : 'normal'}>
                    {table.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {table.rows} rows • {table.description}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={9}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <DataObject sx={{ mr: 1, verticalAlign: 'middle' }} />
                SQL Query
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Enter SQL query (SELECT only)"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Example Queries</InputLabel>
                  <Select
                    value=""
                    label="Example Queries"
                    onChange={(e) => setSqlQuery(e.target.value)}
                  >
                    <MenuItem value={`SELECT * FROM users LIMIT 10`}>
                      Show Users
                    </MenuItem>
                    <MenuItem value={`SELECT * FROM subscription_tiers LIMIT 10`}>
                      Show Subscription Tiers
                    </MenuItem>
                    <MenuItem value={`SELECT * FROM subscriptions LIMIT 10`}>
                      Show Subscriptions
                    </MenuItem>
                    <MenuItem value={`SELECT u.username, u.email, st.name as tier_name, s.expires_at 
FROM users u
JOIN subscriptions s ON u.id = s.user_id
JOIN subscription_tiers st ON s.tier_id = st.id
LIMIT 10`}>
                      Users with Subscription Details
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={executeQuery}
                  disabled={executingQuery || !sqlQuery.trim()}
                  endIcon={executingQuery ? <CircularProgress size={20} /> : <Send />}
                >
                  Execute Query
                </Button>
              </Box>
              
              {queryError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {queryError}
                </Alert>
              )}
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Query Results
              </Typography>
              
              {queryResult ? (
                <>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Chip 
                      label={`${queryResult.rows?.length || 0} rows`} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Typography variant="caption" color="text.secondary">
                      Query time: {queryResult.query_time}
                    </Typography>
                  </Box>
                
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {queryResult.columns?.map((column) => (
                            <TableCell key={column}>{column}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queryResult.rows?.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {queryResult.columns?.map((column) => (
                              <TableCell key={column}>
                                {row[column] === null 
                                  ? <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span> 
                                  : String(row[column])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: 200,
                    bgcolor: 'background.default' 
                  }}
                >
                  <Typography color="text.secondary">
                    Execute a query to see results
                  </Typography>
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default DatabaseExplorer;