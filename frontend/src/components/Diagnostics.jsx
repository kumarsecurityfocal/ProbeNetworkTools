import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as RunIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { runDiagnostic, getDiagnosticHistory } from '../services/api';

const DiagnosticTool = ({ onRunComplete }) => {
  const [tool, setTool] = useState('ping');
  const [target, setTarget] = useState('');
  const [options, setOptions] = useState({
    ping: { count: 4 },
    traceroute: { maxHops: 30 },
    dns: { recordType: 'A' }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleToolChange = (event) => {
    setTool(event.target.value);
  };
  
  const handleTargetChange = (event) => {
    setTarget(event.target.value);
    if (error) setError('');
  };
  
  const handleOptionChange = (optionName, value) => {
    setOptions({
      ...options,
      [tool]: {
        ...options[tool],
        [optionName]: value
      }
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!target.trim()) {
      setError('Please enter a target (hostname or IP address)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let params = { target };
      
      // Add tool-specific parameters
      if (tool === 'ping') {
        params.count = options.ping.count;
      } else if (tool === 'traceroute') {
        params.max_hops = options.traceroute.maxHops;
      } else if (tool === 'dns') {
        params.record_type = options.dns.recordType;
      }
      
      const result = await runDiagnostic(tool, params);
      
      // Notify parent component about the new result
      if (onRunComplete) {
        onRunComplete(result);
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      setError(error.message || 'An error occurred while running the diagnostic');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Run Diagnostic
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="tool-select-label">Diagnostic Tool</InputLabel>
              <Select
                labelId="tool-select-label"
                id="tool-select"
                value={tool}
                label="Diagnostic Tool"
                onChange={handleToolChange}
                disabled={loading}
              >
                <MenuItem value="ping">Ping</MenuItem>
                <MenuItem value="traceroute">Traceroute</MenuItem>
                <MenuItem value="dns">DNS Lookup</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Target (hostname or IP)"
              value={target}
              onChange={handleTargetChange}
              disabled={loading}
              helperText="e.g., example.com, 8.8.8.8"
            />
          </Grid>
          
          {tool === 'ping' && (
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Count"
                value={options.ping.count}
                onChange={(e) => handleOptionChange('count', e.target.value)}
                disabled={loading}
                inputProps={{ min: 1, max: 20 }}
                helperText="Number of packets to send"
              />
            </Grid>
          )}
          
          {tool === 'traceroute' && (
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Hops"
                value={options.traceroute.maxHops}
                onChange={(e) => handleOptionChange('maxHops', e.target.value)}
                disabled={loading}
                inputProps={{ min: 1, max: 64 }}
                helperText="Maximum number of hops"
              />
            </Grid>
          )}
          
          {tool === 'dns' && (
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="record-type-label">Record Type</InputLabel>
                <Select
                  labelId="record-type-label"
                  id="record-type"
                  value={options.dns.recordType}
                  label="Record Type"
                  onChange={(e) => handleOptionChange('recordType', e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="A">A</MenuItem>
                  <MenuItem value="AAAA">AAAA</MenuItem>
                  <MenuItem value="MX">MX</MenuItem>
                  <MenuItem value="NS">NS</MenuItem>
                  <MenuItem value="TXT">TXT</MenuItem>
                  <MenuItem value="CNAME">CNAME</MenuItem>
                  <MenuItem value="SOA">SOA</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Run Diagnostic'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

const DiagnosticHistory = ({ refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await getDiagnosticHistory();
        // Ensure the response is an array
        setHistory(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error fetching diagnostic history:', error);
        setError('Failed to load diagnostic history');
        // Set empty array on error
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [refreshTrigger]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  const emptyRows = page > 1 ? Math.max(0, (page) * rowsPerPage - history.length) : 0;
  const visibleHistory = history.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Diagnostic History
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      {history.length === 0 ? (
        <Typography variant="body2" sx={{ textAlign: 'center', py: 3 }}>
          No diagnostic history found. Run a diagnostic to see results here.
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tool</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.tool.toUpperCase()}</TableCell>
                    <TableCell>{item.target}</TableCell>
                    <TableCell>
                      {item.status === 'success' ? (
                        <Alert severity="success" sx={{ py: 0 }}>Success</Alert>
                      ) : (
                        <Alert severity="error" sx={{ py: 0 }}>Failed</Alert>
                      )}
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>{item.execution_time} ms</TableCell>
                    <TableCell>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>View Result</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <pre className="diagnostic-result">{item.result}</pre>
                        </AccordionDetails>
                      </Accordion>
                    </TableCell>
                  </TableRow>
                ))}
                {emptyRows > 0 && (
                  <TableRow style={{ height: 53 * emptyRows }}>
                    <TableCell colSpan={6} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil(history.length / rowsPerPage)}
              page={page}
              onChange={handleChangePage}
              color="primary"
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

const DiagnosticResult = ({ result }) => {
  if (!result) return null;
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Latest Result
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          {result.tool.toUpperCase()}: {result.target}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          Run at: {new Date(result.created_at).toLocaleString()} | Execution time: {result.execution_time} ms
        </Typography>
      </Box>
      
      <Box className="diagnostic-result" sx={{ maxHeight: '400px', overflow: 'auto' }}>
        <pre>{result.result}</pre>
      </Box>
    </Paper>
  );
};

const Diagnostics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [latestResult, setLatestResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleDiagnosticComplete = (result) => {
    setLatestResult(result);
    setRefreshTrigger(prev => prev + 1);
    setTabValue(1); // Switch to Results tab
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Network Diagnostics
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="diagnostics tabs">
          <Tab label="Run Diagnostic" />
          <Tab label="Results" />
        </Tabs>
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <DiagnosticTool onRunComplete={handleDiagnosticComplete} />
        )}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <>
            {latestResult && <DiagnosticResult result={latestResult} />}
            <DiagnosticHistory refreshTrigger={refreshTrigger} />
          </>
        )}
      </Box>
    </Container>
  );
};

export default Diagnostics;
