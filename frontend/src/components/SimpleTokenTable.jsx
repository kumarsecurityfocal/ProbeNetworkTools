import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  Chip
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

/**
 * A simple table implementation that avoids the Material-UI Table components
 * which are causing toLowerCase errors with DOM nodes.
 */
const SimpleTokenTable = ({ tokens = [], onDeleteToken, formatDate }) => {
  if (!tokens || tokens.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No tokens found. Generate a new token to see it here.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mb: 2 }}>
      {/* Table header */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: '0.5fr 1.5fr 1fr 1fr 1fr 0.5fr',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          fontWeight: 'bold'
        }}
      >
        <Box>ID</Box>
        <Box>Description</Box>
        <Box>Created</Box>
        <Box>Expires</Box>
        <Box>Status</Box>
        <Box>Actions</Box>
      </Box>

      {/* Table content */}
      <Box sx={{ maxHeight: 440, overflow: 'auto' }}>
        {tokens.map((token) => {
          // Safe check for token data
          if (!token || typeof token !== 'object') {
            return null;
          }
          
          // Create safe versions of potentially problematic values
          const safeId = token.id || '';
          const safeDescription = token.description || token.name || 'No description';
          const safeCreatedAt = token.created_at || '';
          const safeExpiryDate = token.expiry_date || '';
          const isUsed = !!token.used;
          const isExpired = safeExpiryDate ? new Date(safeExpiryDate) < new Date() : false;
          
          return (
            <Box 
              key={safeId}
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: '0.5fr 1.5fr 1fr 1fr 1fr 0.5fr',
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box>{safeId}</Box>
              <Box>{safeDescription}</Box>
              <Box>{formatDate(safeCreatedAt)}</Box>
              <Box>{formatDate(safeExpiryDate)}</Box>
              <Box>
                <Chip 
                  label={isUsed ? 'Used' : (isExpired ? 'Expired' : 'Valid')} 
                  color={isUsed ? 'default' : (isExpired ? 'warning' : 'success')}
                  size="small"
                />
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => onDeleteToken(safeId)}
                  color="error"
                  title="Revoke token"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default SimpleTokenTable;