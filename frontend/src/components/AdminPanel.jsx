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
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  CardMembership as SubscriptionIcon,
  Speed as MetricsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as VerifiedIcon,
  Cancel as CancelIcon,
  DeleteOutline as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAllSubscriptions, getSubscriptionTiers, cancelSubscription, updateSubscription, renewSubscription } from '../services/subscription';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changeUserStatus, 
  verifyUserEmail, 
  resetUserPassword 
} from '../services/users';

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
  const { user: currentLoggedInUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // Subscription state
  const [subscriptions, setSubscriptions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editSubscriptionDialog, setEditSubscriptionDialog] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [renewMonths, setRenewMonths] = useState(1);
  
  // User management state
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Form fields for user creation/editing
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false,
    is_active: true,
    email_verified: true
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Check if user is admin
  useEffect(() => {
    if (currentLoggedInUser && !currentLoggedInUser.is_admin) {
      setError('Access denied. Admin privileges required.');
    }
  }, [currentLoggedInUser]);

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

    if (currentLoggedInUser && currentLoggedInUser.is_admin) {
      fetchData();
    }
  }, [currentLoggedInUser]);
  
  // Load user data
  useEffect(() => {
    const fetchUsers = async () => {
      setUserLoading(true);
      try {
        const usersData = await getAllUsers();
        setUsers(usersData);
        setUserError(null);
      } catch (err) {
        console.error('Error loading users:', err);
        setUserError('Failed to load users. Please try again later.');
      } finally {
        setUserLoading(false);
      }
    };
    
    if (currentLoggedInUser && currentLoggedInUser.is_admin && tabValue === 1) {
      fetchUsers();
    }
  }, [currentLoggedInUser, tabValue]);

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

  // User management functions
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't include password when editing
      is_admin: user.is_admin,
      is_active: user.is_active,
      email_verified: user.email_verified
    });
    setEditUserDialog(true);
  };
  
  const handleUserFormChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'is_admin' || name === 'is_active' || name === 'email_verified') {
      setUserFormData({
        ...userFormData,
        [name]: checked
      });
    } else {
      setUserFormData({
        ...userFormData,
        [name]: value
      });
    }
  };
  
  const handleSaveUser = async () => {
    try {
      if (currentUser) {
        // Update existing user
        const updateData = { ...userFormData };
        if (!updateData.password) delete updateData.password; // Don't send password if it's empty
        
        await updateUser(currentUser.id, updateData);
        
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
      } else {
        // Create new user
        await createUser(userFormData);
        
        setSnackbar({
          open: true,
          message: 'User created successfully',
          severity: 'success'
        });
      }
      
      // Refresh users list
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      // Close dialog
      setEditUserDialog(false);
    } catch (error) {
      console.error('Error saving user:', error);
      setSnackbar({
        open: true,
        message: `Failed to save user: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleToggleUserStatus = async (user) => {
    try {
      await changeUserStatus(user.id, !user.is_active);
      
      // Refresh users
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      setSnackbar({
        open: true,
        message: `User ${user.is_active ? 'deactivated' : 'activated'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error changing user status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to change user status',
        severity: 'error'
      });
    }
  };
  
  const handleVerifyEmail = async (userId) => {
    try {
      await verifyUserEmail(userId);
      
      // Refresh users
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      setSnackbar({
        open: true,
        message: 'Email verified successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error verifying email:', error);
      setSnackbar({
        open: true,
        message: 'Failed to verify email',
        severity: 'error'
      });
    }
  };
  
  const handleResetPassword = async () => {
    try {
      await resetUserPassword(passwordResetUser.id, newPassword);
      
      setSnackbar({
        open: true,
        message: 'Password reset successfully',
        severity: 'success'
      });
      
      setResetPasswordDialog(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reset password',
        severity: 'error'
      });
    }
  };
  
  const handleDeleteUser = async () => {
    try {
      await deleteUser(userToDelete.id);
      
      // Refresh users
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
      
      setDeleteUserDialog(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
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
          <Tab icon={<PersonIcon />} label="Users" />
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

      {/* Users Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">User Management</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentUser(null);
              setUserFormData({
                username: '',
                email: '',
                password: '',
                is_admin: false,
                is_active: true,
                email_verified: true
              });
              setEditUserDialog(true);
            }}
          >
            Add New User
          </Button>
        </Box>
        
        {userLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : userError ? (
          <Alert severity="error" sx={{ mb: 3 }}>{userError}</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Email Verified</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Chip 
                            label="Admin" 
                            color="primary" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            label="User" 
                            color="default" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
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
                      <TableCell>
                        {user.email_verified ? (
                          <Chip 
                            label="Verified" 
                            color="success" 
                            size="small" 
                            icon={<VerifiedIcon />}
                          />
                        ) : (
                          <Chip 
                            label="Unverified" 
                            color="warning" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex' }}>
                          <Tooltip title="Edit User">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditUser(user)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title={user.is_active ? "Deactivate User" : "Activate User"}>
                            <IconButton 
                              size="small" 
                              color={user.is_active ? "error" : "success"}
                              onClick={() => handleToggleUserStatus(user)}
                              sx={{ mr: 1 }}
                              disabled={user.id === currentLoggedInUser?.id}
                            >
                              {user.is_active ? <BlockIcon fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          
                          {!user.email_verified && (
                            <Tooltip title="Verify Email">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleVerifyEmail(user.id)}
                                sx={{ mr: 1 }}
                              >
                                <VerifiedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Reset Password">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => {
                                setPasswordResetUser(user);
                                setNewPassword('');
                                setResetPasswordDialog(true);
                              }}
                              sx={{ mr: 1 }}
                            >
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete User">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteUserDialog(true);
                              }}
                              disabled={user.id === currentLoggedInUser?.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog} onClose={() => setEditUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="username"
                label="Username"
                value={userFormData.username}
                onChange={handleUserFormChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={userFormData.email}
                onChange={handleUserFormChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="password"
                label={currentUser ? "New Password (leave blank to keep current)" : "Password"}
                type="password"
                value={userFormData.password}
                onChange={handleUserFormChange}
                fullWidth
                required={!currentUser}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_admin"
                    checked={userFormData.is_admin}
                    onChange={handleUserFormChange}
                  />
                }
                label="Admin Role"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_active"
                    checked={userFormData.is_active}
                    onChange={handleUserFormChange}
                  />
                }
                label="Active Account"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="email_verified"
                    checked={userFormData.email_verified}
                    onChange={handleUserFormChange}
                  />
                }
                label="Email Verified"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary">
            {currentUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog} onClose={() => setResetPasswordDialog(false)}>
        <DialogTitle>Reset User Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a new password for user: <strong>{passwordResetUser?.username}</strong>
          </Typography>
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleResetPassword} 
            variant="contained" 
            color="primary"
            disabled={!newPassword}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialog} onClose={() => setDeleteUserDialog(false)}>
        <DialogTitle>Confirm User Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All user data, including diagnostics history and API keys, will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUserDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete User
          </Button>
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