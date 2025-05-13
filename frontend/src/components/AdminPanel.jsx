import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  CardMembership as SubscriptionIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAllSubscriptions, getSubscriptionTiers, cancelSubscription, updateSubscription, renewSubscription } from '../services/subscription';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editSubscriptionDialog, setEditSubscriptionDialog] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [renewMonths, setRenewMonths] = useState(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Check if user is admin
  useEffect(() => {
    if (user && !user.is_admin) {
      setError('Access denied. Admin privileges required.');
    }
  }, [user]);

  // Load subscription data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subsData, tiersData] = await Promise.all([
          getAllSubscriptions(),
          getSubscriptionTiers()
        ]);
        setSubscriptions(subsData);
        setTiers(tiersData);
      } catch (err) {
        console.error('Error loading admin data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.is_admin) {
      fetchData();
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditSubscription = (subscription) => {
    setCurrentSubscription(subscription);
    setSelectedTierId(subscription.tier_id);
    setEditSubscriptionDialog(true);
  };

  const handleRenewSubscription = async (subscriptionId) => {
    try {
      await renewSubscription(subscriptionId, renewMonths);
      
      // Refresh subscriptions
      const updatedSubs = await getAllSubscriptions();
      setSubscriptions(updatedSubs);
      
      setSnackbar({
        open: true,
        message: 'Subscription renewed successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error renewing subscription:', error);
      setSnackbar({
        open: true,
        message: 'Failed to renew subscription',
        severity: 'error'
      });
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    try {
      await cancelSubscription(subscriptionId);
      
      // Refresh subscriptions
      const updatedSubs = await getAllSubscriptions();
      setSubscriptions(updatedSubs);
      
      setSnackbar({
        open: true,
        message: 'Subscription cancelled successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setSnackbar({
        open: true,
        message: 'Failed to cancel subscription',
        severity: 'error'
      });
    }
  };

  const handleSaveSubscription = async () => {
    try {
      await updateSubscription(currentSubscription.id, {
        tier_id: selectedTierId,
        user_id: currentSubscription.user_id,
        is_active: true
      });
      
      // Refresh subscriptions
      const updatedSubs = await getAllSubscriptions();
      setSubscriptions(updatedSubs);
      
      setEditSubscriptionDialog(false);
      setSnackbar({
        open: true,
        message: 'Subscription updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update subscription',
        severity: 'error'
      });
    }
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format date string
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  // Get tier name by ID
  const getTierName = (tierId) => {
    const tier = tiers.find(t => t.id === tierId);
    return tier ? tier.name : 'Unknown';
  };

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading admin panel...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="admin panel tabs"
        >
          <Tab icon={<SubscriptionIcon />} label="Subscriptions" />
          <Tab icon={<PersonIcon />} label="Users" disabled />
        </Tabs>
      </Box>

      {/* Subscriptions Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          User Subscriptions
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.length > 0 ? (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.id}</TableCell>
                    <TableCell>{sub.user_id}</TableCell>
                    <TableCell>{getTierName(sub.tier_id)}</TableCell>
                    <TableCell>
                      {sub.is_active ? (
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small" 
                        />
                      ) : (
                        <Chip 
                          label="Inactive" 
                          color="error" 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(sub.starts_at)}</TableCell>
                    <TableCell>{formatDate(sub.expires_at)}</TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleEditSubscription(sub)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      
                      {sub.is_active ? (
                        <Button 
                          size="small" 
                          color="error"
                          onClick={() => handleCancelSubscription(sub.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button 
                          size="small" 
                          color="success"
                          onClick={() => handleRenewSubscription(sub.id)}
                        >
                          Renew
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Users Tab (Disabled for now) */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6">User Management</Typography>
        <Typography>Coming soon...</Typography>
      </TabPanel>

      {/* Edit Subscription Dialog */}
      <Dialog open={editSubscriptionDialog} onClose={() => setEditSubscriptionDialog(false)}>
        <DialogTitle>Edit Subscription</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="tier-select-label">Subscription Tier</InputLabel>
                <Select
                  labelId="tier-select-label"
                  value={selectedTierId}
                  label="Subscription Tier"
                  onChange={(e) => setSelectedTierId(e.target.value)}
                >
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      {tier.name} - {(tier.price_monthly/100).toFixed(2)}/month
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSubscriptionDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveSubscription} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;