import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Divider, 
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Assessment as ReportIcon,
  DateRange as DateIcon,
  FileDownload as DownloadIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { getDiagnosticHistory } from '../services/api';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('diagnostics');
  const [timeFrame, setTimeFrame] = useState('week');
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day'));
  const [endDate, setEndDate] = useState(dayjs());
  const [data, setData] = useState([]);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [error, setError] = useState(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportFormat, setReportFormat] = useState('pdf');
  
  const isPremiumUser = user?.subscription?.tier?.name === 'STANDARD' || user?.subscription?.tier?.name === 'ENTERPRISE';
  
  useEffect(() => {
    // Reset date range when time frame changes
    switch(timeFrame) {
      case 'day':
        setStartDate(dayjs().subtract(1, 'day'));
        break;
      case 'week':
        setStartDate(dayjs().subtract(7, 'day'));
        break;
      case 'month':
        setStartDate(dayjs().subtract(1, 'month'));
        break;
      case 'quarter':
        setStartDate(dayjs().subtract(3, 'month'));
        break;
      case 'year':
        setStartDate(dayjs().subtract(1, 'year'));
        break;
      case 'custom':
        // Don't change dates for custom
        break;
      default:
        setStartDate(dayjs().subtract(7, 'day'));
    }
    setEndDate(dayjs());
  }, [timeFrame]);
  
  const handleGenerateReport = async () => {
    if (!isPremiumUser) {
      setError("Report generation is only available for Standard and Enterprise subscribers.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Example: fetch diagnostic history for the report
      let params = {
        limit: 100,
        // Convert dates to ISO strings for API
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD')
      };
      
      const history = await getDiagnosticHistory(params);
      setData(history || []);
      setReportGenerated(true);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = (format) => {
    if (!isPremiumUser) {
      setError("Exporting is only available for Standard and Enterprise subscribers.");
      return;
    }
    
    // In a real implementation, this would trigger a download
    console.log(`Exporting report in ${format} format`);
    alert(`Export in ${format.toUpperCase()} would start downloading in a production environment.`);
  };
  
  const handleShare = () => {
    if (!isPremiumUser) {
      setError("Sharing is only available for Standard and Enterprise subscribers.");
      return;
    }
    
    // In a real implementation, this would open a sharing dialog
    alert("Sharing functionality would be available in a production environment.");
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Reports
      </Typography>
      
      {!isPremiumUser && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Report generation is a premium feature. Upgrade to Standard or Enterprise plan to access all reporting features.
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Report
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="report-type-label">Report Type</InputLabel>
              <Select
                labelId="report-type-label"
                id="report-type"
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="diagnostics">Diagnostic History</MenuItem>
                <MenuItem value="scheduled">Scheduled Probes</MenuItem>
                <MenuItem value="api_usage">API Usage</MenuItem>
                <MenuItem value="performance">Network Performance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="time-frame-label">Time Frame</InputLabel>
              <Select
                labelId="time-frame-label"
                id="time-frame"
                value={timeFrame}
                label="Time Frame"
                onChange={(e) => setTimeFrame(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="day">Last 24 Hours</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last 90 Days</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setOpenDatePicker(true)}
              startIcon={<DateIcon />}
              disabled={timeFrame !== 'custom' || loading}
              sx={{ height: '56px' }}
            >
              {timeFrame === 'custom' 
                ? `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`
                : 'Select Custom Dates'}
            </Button>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateReport}
                disabled={loading || !isPremiumUser}
                startIcon={loading ? <CircularProgress size={20} /> : <ReportIcon />}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              
              <Box>
                <FormControl variant="outlined" size="small" sx={{ width: 120, mr: 1 }}>
                  <InputLabel id="format-label">Format</InputLabel>
                  <Select
                    labelId="format-label"
                    id="format"
                    value={reportFormat}
                    label="Format"
                    onChange={(e) => setReportFormat(e.target.value)}
                    disabled={loading || !reportGenerated || !isPremiumUser}
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  disabled={loading || !reportGenerated || !isPremiumUser}
                  onClick={() => handleExport(reportFormat)}
                  sx={{ mr: 1 }}
                >
                  Export
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  disabled={loading || !reportGenerated || !isPremiumUser}
                  onClick={handleShare}
                >
                  Share
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
      
      {reportGenerated && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Report Results
            </Typography>
            <Chip 
              label={`${data.length} records`} 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {data.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>Tool</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Execution Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.tool.toUpperCase()}
                          color={row.tool === 'ping' ? 'primary' : row.tool === 'traceroute' ? 'secondary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{row.target}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status}
                          color={row.status === 'success' ? 'success' : 'error'}
                          size="small"
                          icon={row.status === 'success' ? <CheckIcon /> : <CloseIcon />}
                        />
                      </TableCell>
                      <TableCell>{row.execution_time} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No data available for the selected time period and report type.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Custom Date Picker Dialog */}
      <Dialog open={openDatePicker} onClose={() => setOpenDatePicker(false)}>
        <DialogTitle>Select Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ width: '100%', mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
                maxDate={endDate}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
                minDate={startDate}
                maxDate={dayjs()}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDatePicker(false)}>Cancel</Button>
          <Button onClick={() => setOpenDatePicker(false)} color="primary">Apply</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports;