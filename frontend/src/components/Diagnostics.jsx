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
  Pagination,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as RunIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { runDiagnostic, getDiagnosticHistory } from '../services/api';

const DiagnosticTool = ({ onRunComplete, prefilledTool }) => {
  const [tool, setTool] = useState(prefilledTool?.tool || 'ping');
  const [target, setTarget] = useState(prefilledTool?.target || '');
  const [options, setOptions] = useState({
    ping: { count: 4, timeout: 5, packetSize: 56 },
    traceroute: { maxHops: 30, timeout: 5, protocol: 'tcp' },
    dns: { recordType: 'A', resolver: '', recursive: true },
    whois: {}, // No additional options for WHOIS
    port: { ports: '80,443', protocol: 'tcp', timeout: 5 },
    http: { 
      method: 'GET', 
      headers: '', 
      body: '', 
      followRedirects: true, 
      timeout: 30 
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Handle prefilling when prefilledTool changes
  useEffect(() => {
    if (prefilledTool) {
      setTool(prefilledTool.tool);
      setTarget(prefilledTool.target);
      
      // If there are specific params, we could update the options state here
      if (prefilledTool.params) {
        setOptions(prevOptions => ({
          ...prevOptions,
          [prefilledTool.tool]: {
            ...prevOptions[prefilledTool.tool],
            ...prefilledTool.params
          }
        }));
      }
    }
  }, [prefilledTool]);
  
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

  // Parse headers from string to object
  const parseHeaders = (headersStr) => {
    if (!headersStr.trim()) return {};
    
    const headers = {};
    const lines = headersStr.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      
      if (key && value) {
        headers[key] = value;
      }
    }
    
    return headers;
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
      let data = null;
      
      // Add tool-specific parameters
      switch (tool) {
        case 'ping':
          params.count = options.ping.count;
          params.timeout = options.ping.timeout;
          if (showAdvanced) {
            params.packet_size = options.ping.packetSize;
          }
          break;
        
        case 'traceroute':
          params.max_hops = options.traceroute.maxHops;
          params.timeout = options.traceroute.timeout;
          if (showAdvanced) {
            params.protocol = options.traceroute.protocol;
          }
          break;
        
        case 'dns':
          params.record_type = options.dns.recordType;
          if (showAdvanced) {
            if (options.dns.resolver) params.resolver = options.dns.resolver;
            params.recursive = options.dns.recursive;
          }
          break;
        
        case 'port':
          params.ports = options.port.ports;
          params.protocol = options.port.protocol;
          params.timeout = options.port.timeout;
          break;
        
        case 'http':
          params.url = target;
          params.method = options.http.method;
          params.follow_redirects = options.http.followRedirects;
          params.timeout = options.http.timeout;
          
          // For POST/PUT, prepare the body and headers
          if (options.http.method === 'POST' || options.http.method === 'PUT') {
            data = {
              body: options.http.body,
              headers: parseHeaders(options.http.headers)
            };
          } else if (options.http.headers) {
            data = {
              headers: parseHeaders(options.http.headers)
            };
          }
          break;
      }
      
      const result = await runDiagnostic(tool, params, data);
      
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
                <MenuItem value="whois">WHOIS Lookup</MenuItem>
                <MenuItem value="port">Port Check</MenuItem>
                <MenuItem value="http">HTTP(S) Request</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label={tool === 'http' ? "URL" : "Target (hostname or IP)"}
              value={target}
              onChange={handleTargetChange}
              disabled={loading}
              helperText={tool === 'http' ? "e.g., https://example.com/api/status" : "e.g., example.com, 8.8.8.8"}
            />
          </Grid>
          
          {/* Ping Options */}
          {tool === 'ping' && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Count"
                  value={options.ping.count}
                  onChange={(e) => handleOptionChange('count', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 50 }}
                  helperText="Number of packets (1-50)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout"
                  value={options.ping.timeout}
                  onChange={(e) => handleOptionChange('timeout', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 60 }}
                  helperText="Seconds to wait (1-60)"
                />
              </Grid>
              {showAdvanced && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Packet Size"
                    value={options.ping.packetSize}
                    onChange={(e) => handleOptionChange('packetSize', parseInt(e.target.value))}
                    disabled={loading}
                    inputProps={{ min: 16, max: 1472 }}
                    helperText="Size in bytes (16-1472)"
                  />
                </Grid>
              )}
            </>
          )}
          
          {/* Traceroute Options */}
          {tool === 'traceroute' && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Hops"
                  value={options.traceroute.maxHops}
                  onChange={(e) => handleOptionChange('maxHops', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 30 }}
                  helperText="Maximum route steps (1-30)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout"
                  value={options.traceroute.timeout}
                  onChange={(e) => handleOptionChange('timeout', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 60 }}
                  helperText="Seconds to wait (1-60)"
                />
              </Grid>
              {showAdvanced && (
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                      value={options.traceroute.protocol}
                      label="Protocol"
                      onChange={(e) => handleOptionChange('protocol', e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="tcp">TCP</MenuItem>
                      <MenuItem value="udp">UDP</MenuItem>
                      <MenuItem value="icmp">ICMP</MenuItem>
                    </Select>
                    <Typography variant="caption" color="textSecondary">
                      Protocol to use for trace
                    </Typography>
                  </FormControl>
                </Grid>
              )}
            </>
          )}
          
          {/* DNS Lookup Options */}
          {tool === 'dns' && (
            <>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Record Type</InputLabel>
                  <Select
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
                    <MenuItem value="PTR">PTR</MenuItem>
                  </Select>
                  <Typography variant="caption" color="textSecondary">
                    DNS record type to query
                  </Typography>
                </FormControl>
              </Grid>
              {showAdvanced && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="DNS Resolver"
                      value={options.dns.resolver}
                      onChange={(e) => handleOptionChange('resolver', e.target.value)}
                      disabled={loading}
                      helperText="Custom DNS server (optional)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={options.dns.recursive}
                          onChange={(e) => handleOptionChange('recursive', e.target.checked)}
                          disabled={loading}
                        />
                      }
                      label="Recursive Query"
                    />
                  </Grid>
                </>
              )}
            </>
          )}
          
          {/* Port Check Options */}
          {tool === 'port' && (
            <>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Port(s)"
                  value={options.port.ports}
                  onChange={(e) => handleOptionChange('ports', e.target.value)}
                  disabled={loading}
                  helperText="Single port or comma-separated list"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Protocol</InputLabel>
                  <Select
                    value={options.port.protocol}
                    label="Protocol"
                    onChange={(e) => handleOptionChange('protocol', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="tcp">TCP</MenuItem>
                    <MenuItem value="udp">UDP</MenuItem>
                  </Select>
                  <Typography variant="caption" color="textSecondary">
                    Connection protocol
                  </Typography>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout"
                  value={options.port.timeout}
                  onChange={(e) => handleOptionChange('timeout', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 60 }}
                  helperText="Seconds to wait (1-60)"
                />
              </Grid>
            </>
          )}
          
          {/* HTTP Request Options */}
          {tool === 'http' && (
            <>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={options.http.method}
                    label="Method"
                    onChange={(e) => handleOptionChange('method', e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                    <MenuItem value="HEAD">HEAD</MenuItem>
                    <MenuItem value="OPTIONS">OPTIONS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout"
                  value={options.http.timeout}
                  onChange={(e) => handleOptionChange('timeout', parseInt(e.target.value))}
                  disabled={loading}
                  inputProps={{ min: 1, max: 300 }}
                  helperText="Seconds to wait (1-300)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={options.http.followRedirects}
                      onChange={(e) => handleOptionChange('followRedirects', e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Follow Redirects"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Headers"
                  value={options.http.headers}
                  onChange={(e) => handleOptionChange('headers', e.target.value)}
                  disabled={loading}
                  multiline
                  rows={3}
                  helperText="One header per line, format: Key: Value"
                />
              </Grid>
              
              {(options.http.method === 'POST' || options.http.method === 'PUT') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Request Body"
                    value={options.http.body}
                    onChange={(e) => handleOptionChange('body', e.target.value)}
                    disabled={loading}
                    multiline
                    rows={5}
                    helperText="Enter request body (JSON, form data, etc.)"
                  />
                </Grid>
              )}
            </>
          )}
          
          {/* Tool options toggle */}
          <Grid item xs={12}>
            {tool !== 'whois' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showAdvanced}
                    onChange={(e) => setShowAdvanced(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Show Advanced Options"
              />
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              {loading ? 'Running...' : 'Run Diagnostic'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

const DiagnosticHistory = ({ refreshTrigger, onRepeatDiagnostic }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [toolFilter, setToolFilter] = useState('all');
  
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Get more results than we'll display to allow for filtering
        const response = await getDiagnosticHistory({ limit: 100 });
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
  
  const handleExportCSV = () => {
    // This would normally check the user's subscription tier
    alert('CSV export is available for Standard and Enterprise tier subscriptions.');
    
    // Implementation would create a CSV file
    // const csvContent = "data:text/csv;charset=utf-8," + 
    //   "Tool,Target,Status,Time,Duration\n" +
    //   filteredHistory.map(item => 
    //     `${item.tool},${item.target},${item.status},${new Date(item.created_at).toLocaleString()},${item.execution_time}`
    //   ).join("\n");
    // const encodedUri = encodeURI(csvContent);
    // const link = document.createElement("a");
    // link.setAttribute("href", encodedUri);
    // link.setAttribute("download", "diagnostic_history.csv");
    // document.body.appendChild(link);
    // link.click();
  };
  
  const handleRepeat = (item) => {
    if (onRepeatDiagnostic) {
      onRepeatDiagnostic(item);
    }
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when searching
  };
  
  const handleToolFilterChange = (event) => {
    setToolFilter(event.target.value);
    setPage(1); // Reset to first page when filtering
  };
  
  // Apply filtering
  const filteredHistory = history.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tool.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTool = toolFilter === 'all' || item.tool === toolFilter;
    
    return matchesSearch && matchesTool;
  });
  
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
  
  const emptyRows = page > 1 ? Math.max(0, (page) * rowsPerPage - filteredHistory.length) : 0;
  const visibleHistory = filteredHistory.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  // Get unique tools for filter dropdown
  const tools = ['all', ...new Set(history.map(item => item.tool))];
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Diagnostic History
        </Typography>
        
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<RefreshIcon />} 
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      {/* Search and filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by target or tool..."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Filter by Tool</InputLabel>
            <Select
              value={toolFilter}
              label="Filter by Tool"
              onChange={handleToolFilterChange}
            >
              {tools.map(tool => (
                <MenuItem key={tool} value={tool}>
                  {tool === 'all' ? 'All Tools' : (tool ? tool.toUpperCase() : 'UNKNOWN')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button 
            variant="outlined" 
            fullWidth
            size="medium" 
            onClick={handleExportCSV}
          >
            Export to CSV
          </Button>
        </Grid>
      </Grid>
      
      {filteredHistory.length === 0 ? (
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
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Chip 
                        label={item.tool ? item.tool.toUpperCase() : 'UNKNOWN'} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.target}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '200px' }}>
                          {item.target}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status === 'success' ? 'Success' : 'Failed'}
                        color={item.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>{item.execution_time} ms</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                        <Tooltip title="Repeat this diagnostic">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleRepeat(item)}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Accordion sx={{ ml: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2">View Result</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ 
                              backgroundColor: '#2d2d2d', 
                              color: '#ffffff',
                              p: 2, 
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              maxHeight: '200px',
                              overflow: 'auto'
                            }}>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'inherit' }}>{item.result}</pre>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      </Box>
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
              count={Math.ceil(filteredHistory.length / rowsPerPage)}
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
  
  const handleCopyResult = () => {
    navigator.clipboard.writeText(result.result)
      .then(() => {
        alert('Result copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  const handleExportPdf = () => {
    // This would normally check the user's subscription tier
    // For now, we'll just show an alert
    alert('PDF export is available for Standard and Enterprise tier subscriptions.');
    
    // Implementation would create a PDF using a library like jsPDF
    // const doc = new jsPDF();
    // doc.text(result.result, 10, 10);
    // doc.save(`diagnostic-${result.id}.pdf`);
  };
  
  const handleScheduleRecurring = () => {
    // This would normally open a dialog to schedule a recurring probe
    alert('This would open a dialog to schedule this diagnostic as a recurring probe.');
  };
  
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Latest Result
        </Typography>
        <Box>
          <Tooltip title="Copy to Clipboard">
            <IconButton onClick={handleCopyResult} size="small" sx={{ mr: 1 }}>
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save as PDF (Standard/Enterprise tier)">
            <IconButton onClick={handleExportPdf} size="small" sx={{ mr: 1 }}>
              <PdfIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Schedule Recurring">
            <IconButton onClick={handleScheduleRecurring} size="small">
              <ScheduleIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          {result.tool ? result.tool.toUpperCase() : 'UNKNOWN'}: {result.target || 'No target'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" display="block" color="text.secondary">
            Run at: {new Date(result.created_at).toLocaleString()} | Execution time: {result.execution_time} ms
          </Typography>
          <Chip 
            label={result.status === 'success' ? 'Success' : 'Failed'} 
            color={result.status === 'success' ? 'success' : 'error'} 
            size="small"
          />
        </Box>
      </Box>
      
      <Box className="diagnostic-result" sx={{ 
        maxHeight: '400px', 
        overflow: 'auto', 
        backgroundColor: '#2d2d2d', 
        color: '#ffffff',
        p: 2, 
        borderRadius: 1,
        fontFamily: 'monospace'
      }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'inherit' }}>{result.result}</pre>
      </Box>
    </Paper>
  );
};

const Diagnostics = () => {
  const [tabValue, setTabValue] = useState(0);
  const [latestResult, setLatestResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toolRef, setToolRef] = useState(null);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleDiagnosticComplete = (result) => {
    setLatestResult(result);
    setRefreshTrigger(prev => prev + 1);
    setTabValue(1); // Switch to Results tab
  };
  
  const handleRepeatDiagnostic = (diagnostic) => {
    // Set up the tool reference to prefill the form
    setToolRef({
      tool: diagnostic.tool,
      target: diagnostic.target,
      // Extract parameters from target for more complex tools
      // This is a basic implementation and could be enhanced
      params: {}
    });
    
    // Switch to the Run Diagnostic tab
    setTabValue(0);
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
          <DiagnosticTool 
            onRunComplete={handleDiagnosticComplete} 
            prefilledTool={toolRef}
          />
        )}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <>
            {latestResult && <DiagnosticResult result={latestResult} />}
            <DiagnosticHistory 
              refreshTrigger={refreshTrigger} 
              onRepeatDiagnostic={handleRepeatDiagnostic}
            />
          </>
        )}
      </Box>
    </Container>
  );
};

export default Diagnostics;
