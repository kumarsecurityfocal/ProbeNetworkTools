import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import DatabaseExplorer from '../components/DatabaseExplorer';

const DatabasePage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          ProbeOps Database Explorer
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          This tool provides direct access to the ProbeOps database for administrative purposes.
          You can view and query tables, run diagnostics, and export data using the tools below.
        </Typography>
      </Paper>
      
      <DatabaseExplorer />
    </Box>
  );
};

export default DatabasePage;