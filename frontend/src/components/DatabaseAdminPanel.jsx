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
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import { useApi } from '../hooks/useApi';

const DatabaseAdminPanel = () => {
  const { api } = useApi();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [statusMessage, setStatusMessage] = useState({ type: 'info', message: 'Ready to perform database operations' });

  // Fetch list of tables on component mount
  useEffect(() => {
    fetchTables();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch all tables from the database
  const fetchTables = async () => {
    setLoading(true);
    setError('');
    setStatusMessage({ type: 'info', message: 'Fetching database tables...' });
    
    try {
      const response = await api.get('/api/admin/db-tables');
      setTables(response.data.tables);
      setStatusMessage({ type: 'success', message: 'Database tables loaded successfully' });
      
      if (response.data.tables.length > 0 && !selectedTable) {
        setSelectedTable(response.data.tables[0]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError('Failed to fetch tables: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to fetch database tables' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for a specific table
  const fetchTableData = async (tableName) => {
    if (!tableName) return;
    
    setTableLoading(true);
    setError('');
    setStatusMessage({ type: 'info', message: `Loading data from table '${tableName}'...` });
    
    try {
      const response = await api.get(`/api/admin/db-table/${tableName}`);
      setTableData(response.data.rows);
      setTableColumns(response.data.columns);
      setStatusMessage({ type: 'success', message: `Table '${tableName}' data loaded successfully` });
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
      setError(`Failed to fetch data for table ${tableName}: ` + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: `Failed to load data from table '${tableName}'` });
    } finally {
      setTableLoading(false);
    }
  };

  // Handle table selection change
  const handleTableChange = (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    setEditingRow(null);
    setEditData({});
    fetchTableData(tableName);
  };

  // Handle row edit click
  const handleEditClick = (row, index) => {
    setEditingRow(index);
    setEditData({ ...row });
  };

  // Handle edit field change
  const handleEditChange = (column, value) => {
    setEditData(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Save edited row
  const handleSaveClick = async (row) => {
    try {
      setStatusMessage({ type: 'info', message: 'Saving changes...' });
      const response = await api.put(`/api/admin/db-row/${selectedTable}`, {
        original: row,
        updated: editData
      });
      
      // Update the table data with the updated row
      const updatedTableData = [...tableData];
      const rowIndex = updatedTableData.findIndex(item => 
        Object.keys(row).every(key => item[key] === row[key])
      );
      
      if (rowIndex !== -1) {
        updatedTableData[rowIndex] = response.data.row;
        setTableData(updatedTableData);
      }
      
      setEditingRow(null);
      setEditData({});
      setStatusMessage({ type: 'success', message: 'Row updated successfully' });
    } catch (error) {
      console.error('Error updating row:', error);
      setError('Failed to update row: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to save changes' });
    }
  };

  // Cancel editing
  const handleCancelClick = () => {
    setEditingRow(null);
    setEditData({});
  };

  // Show delete confirmation dialog
  const handleDeleteClick = (row, index) => {
    setSelectedRow(row);
    setShowConfirmDialog(true);
  };

  // Confirm row deletion
  const handleConfirmDelete = async () => {
    try {
      setStatusMessage({ type: 'info', message: 'Deleting row...' });
      await api.delete(`/api/admin/db-row/${selectedTable}`, {
        data: { row: selectedRow }
      });
      
      // Remove the deleted row from the table data
      const updatedTableData = tableData.filter(item => 
        !Object.keys(selectedRow).every(key => item[key] === selectedRow[key])
      );
      
      setTableData(updatedTableData);
      setShowConfirmDialog(false);
      setSelectedRow(null);
      setStatusMessage({ type: 'success', message: 'Row deleted successfully' });
    } catch (error) {
      console.error('Error deleting row:', error);
      setError('Failed to delete row: ' + (error.response?.data?.detail || error.message));
      setStatusMessage({ type: 'error', message: 'Failed to delete row' });
    }
  };

  // Execute custom SQL query
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setQueryLoading(true);
    setError('');
    setStatusMessage({ type: 'info', message: 'Executing SQL query...' });
    
    try {
      const response = await api.post('/api/admin/execute-query', { query: sqlQuery });
      setQueryResult(response.data);
      setStatusMessage({ type: 'success', message: 'SQL query executed successfully' });
    } catch (error) {
      console.error('Error executing query:', error);
      setQueryResult({
        error: true,
        message: 'Query execution failed: ' + (error.response?.data?.detail || error.message)
      });
      setStatusMessage({ type: 'error', message: 'Failed to execute SQL query' });
    } finally {
      setQueryLoading(false);
    }
  };

  // Render query result
  const renderQueryResult = () => {
    if (!queryResult) return null;
    
    if (queryResult.error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {queryResult.message}
        </Alert>
      );
    }
    
    if (queryResult.rowCount === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Query executed successfully. No rows returned.
        </Alert>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Query result: {queryResult.rowCount} row(s) {queryResult.affected ? `affected` : `returned`}
        </Typography>
        
        {queryResult.rows && queryResult.rows.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(queryResult.rows[0]).map((column) => (
                    <TableCell key={column}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {queryResult.rows.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, colIndex) => (
                      <TableCell key={colIndex}>
                        {value === null ? 'NULL' : String(value)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Database Administration
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Alert severity={statusMessage.type} sx={{ mb: 3 }}>
        {statusMessage.message}
      </Alert>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Table Explorer" />
          <Tab label="SQL Query" />
        </Tabs>
      </Paper>
      
      {/* Table Explorer Tab */}
      {tabValue === 0 && (
        <>
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <FormControl sx={{ minWidth: 200, mr: 2 }}>
                <InputLabel>Select Table</InputLabel>
                <Select
                  value={selectedTable}
                  onChange={handleTableChange}
                  label="Select Table"
                  disabled={loading || tables.length === 0}
                >
                  {tables.map((table) => (
                    <MenuItem key={table} value={table}>
                      {table}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={fetchTables}
                disabled={loading}
              >
                Refresh Tables
              </Button>
            </Box>
            
            {selectedTable && (
              <Button
                variant="contained"
                onClick={() => fetchTableData(selectedTable)}
                disabled={tableLoading}
                startIcon={tableLoading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              >
                Refresh Data
              </Button>
            )}
          </Paper>
          
          {selectedTable && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    {tableColumns.map((column) => (
                      <TableCell key={column}>{column}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableLoading ? (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length + 1} align="center">
                        <CircularProgress size={40} sx={{ my: 3 }} />
                      </TableCell>
                    </TableRow>
                  ) : tableData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tableColumns.length + 1} align="center">
                        No data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {editingRow === index ? (
                            <Box sx={{ display: 'flex' }}>
                              <IconButton
                                color="primary"
                                onClick={() => handleSaveClick(row)}
                                size="small"
                              >
                                <SaveIcon />
                              </IconButton>
                              <IconButton
                                color="default"
                                onClick={handleCancelClick}
                                size="small"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex' }}>
                              <IconButton
                                color="primary"
                                onClick={() => handleEditClick(row, index)}
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteClick(row, index)}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                        {tableColumns.map((column) => (
                          <TableCell key={column}>
                            {editingRow === index ? (
                              <TextField
                                value={editData[column] === null ? '' : editData[column]}
                                onChange={(e) => handleEditChange(column, e.target.value)}
                                size="small"
                                fullWidth
                                variant="outlined"
                              />
                            ) : (
                              row[column] === null ? 'NULL' : String(row[column])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
      
      {/* SQL Query Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Execute SQL Query
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 3 }}>
            Warning: Be cautious when executing SQL queries. Actions cannot be undone.
          </Alert>
          
          <TextField
            multiline
            fullWidth
            rows={4}
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            variant="outlined"
            placeholder="Enter SQL query..."
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleExecuteQuery}
            disabled={!sqlQuery.trim() || queryLoading}
            startIcon={queryLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Execute Query
          </Button>
          
          {renderQueryResult()}
        </Paper>
      )}
      
      {/* Confirm Delete Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this row? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseAdminPanel;