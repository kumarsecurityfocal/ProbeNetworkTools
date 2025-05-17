import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  IconButton,
  Chip,
  Card,
  CardContent,
  Stack,
  Grid
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

/**
 * A simple list implementation that avoids Material-UI Table components
 * which are causing toLowerCase errors with DOM nodes.
 */
const TokenList = ({ tokens = [], onDeleteToken, formatDate }) => {
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
    <Stack spacing={1} sx={{ my: 2 }}>
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
          <Card key={safeId} variant="outlined" sx={{ mb: 1 }}>
            <CardContent sx={{ pb: '8px !important', pt: 2, px: 2 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={1}>
                  <Typography variant="body2" color="text.secondary">
                    {safeId}
                  </Typography>
                </Grid>
                
                <Grid item xs={3}>
                  <Typography variant="body2">{safeDescription}</Typography>
                </Grid>
                
                <Grid item xs={2}>
                  <Typography variant="body2">{formatDate(safeCreatedAt)}</Typography>
                </Grid>
                
                <Grid item xs={2}>
                  <Typography variant="body2">{formatDate(safeExpiryDate)}</Typography>
                </Grid>
                
                <Grid item xs={2}>
                  <Chip 
                    label={isUsed ? 'Used' : (isExpired ? 'Expired' : 'Valid')} 
                    color={isUsed ? 'default' : (isExpired ? 'warning' : 'success')}
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={2} sx={{ textAlign: 'right' }}>
                  <IconButton
                    size="small"
                    onClick={() => onDeleteToken(safeId)}
                    color="error"
                    title="Revoke token"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default TokenList;