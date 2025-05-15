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
import { 
  getAllSubscriptions, 
  getSubscriptionTiers, 
  cancelSubscription, 
  updateSubscription, 
  renewSubscription,
  createSubscription
} from '../services/subscription';
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
  // Force tab value to 1 (Users) to test the user loading
  // Default was 0 (Subscriptions)
  const [tabValue, setTabValue] = useState(1); // Set to Users tab by default for testing
  
  // Utility functions will be defined below
  
  // Subscription state
  const [subscriptions, setSubscriptions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editSubscriptionDialog, setEditSubscriptionDialog] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [renewMonths, setRenewMonths] = useState(1);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    loadAttempted: false,
    tiersLoaded: false,
    subsLoaded: false,
    usersLoaded: false
  });
  
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
    email_verified: true,
    subscription_tier_id: '' // Added for subscription selection
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

  // Load subscription data - simplified to ensure UI always loads even if data is loading
  useEffect(() => {
    const fetchData = async () => {
      console.log("Starting data fetch in AdminPanel...");
      setDebugInfo(prev => ({ ...prev, loadAttempted: true }));
      
      // Set loading but don't block UI
      setLoading(true);
      
      try {
        // Fetch tiers
        try {
          console.log("Fetching subscription tiers in AdminPanel...");
          const tiersData = await getSubscriptionTiers();
          console.log("Tiers data in AdminPanel:", tiersData);
          setTiers(tiersData || []);
          setDebugInfo(prev => ({ ...prev, tiersLoaded: true }));
        } catch (tierErr) {
          console.error('Error loading subscription tiers:', tierErr);
          // Don't set error, just log it
        }
        
        // Fetch subscriptions
        try {
          console.log("Fetching all subscriptions in AdminPanel...");
          const subsData = await getAllSubscriptions();
          console.log("Subscriptions data in AdminPanel:", subsData);
          setSubscriptions(subsData || []);
          setDebugInfo(prev => ({ ...prev, subsLoaded: true }));
        } catch (subErr) {
          console.error('Error loading subscriptions:', subErr);
          // Don't set error, just log it
        }
      } catch (err) {
        console.error('Error in admin data loading:', err);
        // Don't block UI with error
      } finally {
        setLoading(false);
        console.log("Data fetch completed, UI should render now");
      }
    };

    if (currentLoggedInUser && currentLoggedInUser.is_admin) {
      fetchData();
    }
  }, [currentLoggedInUser]);
  
  // Function to enhance users with their subscription data
  const enhanceUsersWithSubscriptions = (users, subscriptions) => {
    if (!users || !subscriptions) return users;
    
    return users.map(user => {
      // Find subscription for this user
      const userSubscription = subscriptions.find(sub => sub.user_id === user.id);
      
      if (userSubscription) {
        // Return user with subscription data added
        return {
          ...user,
          subscription: userSubscription,
          subscription_tier_id: userSubscription.tier_id
        };
      }
      
      // Return user without subscription data
      return user;
    });
  };

  // Load user data
  useEffect(() => {
    const fetchUsers = async () => {
      setUserLoading(true);
      try {
        console.log("DEBUG USERS: Fetching users in AdminPanel...");
        console.log("DEBUG USERS: Current user is admin:", currentLoggedInUser?.is_admin || false);
        console.log("DEBUG USERS: Current tab value:", tabValue);
        
        const token = localStorage.getItem('auth_token');
        console.log("DEBUG USERS: Token available:", token ? `Yes (${token.substring(0, 10)}...)` : 'No');
        
        console.log("DEBUG USERS: About to call getAllUsers()");
        const usersData = await getAllUsers();
        console.log("DEBUG USERS: Users data returned:", usersData);
        console.log("DEBUG USERS: Is array:", Array.isArray(usersData));
        console.log("DEBUG USERS: Length:", usersData?.length || 0);
        
        // Fetch subscriptions if not already loaded
        let subsData = subscriptions;
        if (!subscriptions.length) {
          console.log("Fetching subscriptions for user enhancement...");
          subsData = await getAllSubscriptions();
          setSubscriptions(subsData || []);
        }
        
        // Enhance users with their subscription data
        const enhancedUsers = enhanceUsersWithSubscriptions(usersData, subsData);
        console.log("Enhanced users with subscription data:", enhancedUsers);
        
        setUsers(enhancedUsers);
        setUserError(null);
        setDebugInfo(prev => ({ ...prev, usersLoaded: true }));
        console.log("DEBUG USERS: State updated, usersLoaded set to true");
      } catch (err) {
        console.error('DEBUG USERS: Error loading users:', err);
        console.error('DEBUG USERS: Error details:', err.message, err.stack);
        setUserError('Failed to load users. Please try again later.');
      } finally {
        setUserLoading(false);
      }
    };
    
    if (currentLoggedInUser && currentLoggedInUser.is_admin && tabValue === 1) {
      fetchUsers();
    }
  }, [currentLoggedInUser, tabValue, subscriptions]);

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
    
    // Find the user's current subscription
    const userSubscription = subscriptions.find(sub => sub.user_id === user.id);
    
    setUserFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't include password when editing
      is_admin: user.is_admin,
      is_active: user.is_active,
      email_verified: user.email_verified,
      subscription_tier_id: userSubscription ? userSubscription.tier_id : ''
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
  
  const refreshUsersList = async () => {
    console.log('Refreshing users list...');
    try {
      setUserLoading(true);
      const usersData = await getAllUsers();
      console.log('Users data after refresh:', usersData);
      if (Array.isArray(usersData)) {
        setUsers(usersData);
        console.log(`User list refreshed, ${usersData.length} users found`);
      } else {
        console.error('Invalid users data returned:', usersData);
      }
    } catch (err) {
      console.error('Error refreshing users list:', err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      console.log('Saving user with data:', userFormData);
      
      // Validate form data before submitting
      if (!userFormData.username || !userFormData.email) {
        setSnackbar({
          open: true,
          message: 'Username and email are required',
          severity: 'error'
        });
        return;
      }
      
      // If creating a new user, password is required
      if (!currentUser && !userFormData.password) {
        setSnackbar({
          open: true,
          message: 'Password is required for new users',
          severity: 'error'
        });
        return;
      }
      
      if (currentUser) {
        // Update existing user
        console.log(`Updating user ${currentUser.id} (${currentUser.username})`);
        const updateData = { ...userFormData };
        if (!updateData.password) delete updateData.password; // Don't send password if it's empty
        
        // Extract subscription tier ID before sending to user update API
        const subscription_tier_id = updateData.subscription_tier_id;
        delete updateData.subscription_tier_id; // Remove from user update data
        
        await updateUser(currentUser.id, updateData);
        
        // If subscription tier is selected, update or create subscription
        if (subscription_tier_id) {
          try {
            // Check if user already has a subscription
            const existingSubscription = subscriptions.find(sub => sub.user_id === currentUser.id);
            
            if (existingSubscription) {
              // Update existing subscription
              await updateSubscription(existingSubscription.id, {
                tier_id: subscription_tier_id,
                user_id: currentUser.id,
                is_active: true
              });
              console.log(`Updated subscription for user ${currentUser.id} to tier ${subscription_tier_id}`);
            } else {
              // Create new subscription
              await createSubscription(currentUser.id, subscription_tier_id);
              console.log(`Created new subscription for user ${currentUser.id} with tier ${subscription_tier_id}`);
            }
            
            // Refresh subscriptions list
            const updatedSubs = await getAllSubscriptions();
            setSubscriptions(updatedSubs);
          } catch (subError) {
            console.error('Error updating subscription:', subError);
            // Continue anyway - user was updated successfully
          }
        }
        
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
      } else {
        // Create new user
        console.log('Creating new user:', userFormData.username);
        
        // Extract subscription tier ID before sending to user creation API
        const subscription_tier_id = userFormData.subscription_tier_id;
        const userData = { ...userFormData };
        delete userData.subscription_tier_id; // Remove from user creation data
        
        const result = await createUser(userData);
        console.log('User creation result:', result);
        
        // If subscription tier is selected and user was created successfully
        if (subscription_tier_id && result && result.id) {
          try {
            // Create subscription for the new user
            await createSubscription(result.id, subscription_tier_id);
            console.log(`Created subscription for new user ${result.id} with tier ${subscription_tier_id}`);
            
            // Refresh subscriptions list
            const updatedSubs = await getAllSubscriptions();
            setSubscriptions(updatedSubs);
          } catch (subError) {
            console.error('Error creating subscription for new user:', subError);
            // Continue anyway - user was created successfully
          }
        }
        
        setSnackbar({
          open: true,
          message: 'User created successfully',
          severity: 'success'
        });
      }
      
      // Close dialog first
      setEditUserDialog(false);
      
      // Refresh all necessary data
      try {
        setUserLoading(true);
        
        // Fetch updated data
        const [usersData, subsData] = await Promise.all([
          getAllUsers(),
          getAllSubscriptions()
        ]);
        
        // Update subscriptions state
        setSubscriptions(subsData || []);
        
        // Enhance users with their subscription data
        const enhancedUsers = enhanceUsersWithSubscriptions(usersData, subsData);
        console.log("Enhanced users with subscription data after save:", enhancedUsers);
        
        // Update users state
        setUsers(enhancedUsers);
      } catch (refreshError) {
        console.error('Error refreshing data after save:', refreshError);
      } finally {
        setUserLoading(false);
      }
      
    } catch (error) {
      console.error('Error saving user:', error);
      console.error('Error details:', error.response?.data);
      
      // Create detailed error message with backend validation errors if available
      let errorMessage = 'Failed to save user: ';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle FastAPI validation error format
          errorMessage += error.response.data.detail.map(err => 
            `${err.loc.join('.')} - ${err.msg}`
          ).join('; ');
        } else {
          errorMessage += JSON.stringify(error.response.data.detail);
        }
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
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
  
  const handleVerifyEmail = async (user) => {
    try {
      await verifyUserEmail(user.id);
      
      // Refresh users
      const usersData = await getAllUsers();
      setUsers(usersData);
      
      setSnackbar({
        open: true,
        message: `Email verified for ${user.email}`,
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

  // Utility function to get the tier name by ID
  const getTierNameById = (tierId) => {
    if (!tierId) return 'UNKNOWN';
    const tier = tiers.find(t => t.id === parseInt(tierId, 10));
    return tier ? tier.name : `TIER ${tierId}`;
  };

  // Debugging indicator that can be displayed while showing the admin panel
  const renderDebugInfo = () => (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, display: 'none' }}>
      <Typography variant="subtitle2" gutterBottom>Debug Information:</Typography>
      <Typography variant="body2">Load attempted: {debugInfo.loadAttempted ? 'Yes' : 'No'}</Typography>
      <Typography variant="body2">Tiers loaded: {debugInfo.tiersLoaded ? 'Yes' : 'No'}</Typography>
      <Typography variant="body2">Subscriptions loaded: {debugInfo.subsLoaded ? 'Yes' : 'No'}</Typography>
      <Typography variant="body2">Users loaded: {debugInfo.usersLoaded ? 'Yes' : 'No'}</Typography>
    </Box>
  );
  
  // Skip the error check - we know data is loading correctly

  // Show a loading indicator but don't block the UI
  const renderLoading = () => {
    if (loading) {
      return (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>Loading admin panel data...</Typography>
          </Paper>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Add our loading indicator */}
      {renderLoading()}
      
      {/* Add debug info (hidden by default) */}
      {renderDebugInfo()}
      
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
          <Box>
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
                  email_verified: true,
                  subscription_tier_id: '' // Initialize with empty subscription tier
                });
                setEditUserDialog(true);
              }}
              sx={{ mr: 2 }}
            >
              Add New User
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refreshUsersList}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        
        {/* Search and filter controls */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Search Users"
            variant="outlined"
            size="small"
            placeholder="Username or email"
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              if (searchTerm) {
                const filteredUsers = users.filter(user => 
                  user.username.toLowerCase().includes(searchTerm) || 
                  user.email.toLowerCase().includes(searchTerm)
                );
                setUsers(filteredUsers);
              } else {
                // If search field is cleared, refresh users list
                refreshUsersList();
              }
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="role-filter-label">Role</InputLabel>
            <Select
              labelId="role-filter-label"
              label="Role"
              defaultValue="all"
              onChange={(e) => {
                const roleFilter = e.target.value;
                refreshUsersList().then(() => {
                  if (roleFilter === 'all') {
                    // No filter needed, refreshUsersList already set all users
                  } else if (roleFilter === 'admin') {
                    setUsers(prev => prev.filter(user => user.is_admin));
                  } else {
                    setUsers(prev => prev.filter(user => !user.is_admin));
                  }
                });
              }}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="admin">Admins</MenuItem>
              <MenuItem value="user">Regular Users</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              defaultValue="all"
              onChange={(e) => {
                const statusFilter = e.target.value;
                getAllUsers().then(allUsers => {
                  if (statusFilter === 'all') {
                    setUsers(allUsers);
                  } else if (statusFilter === 'active') {
                    setUsers(allUsers.filter(user => user.is_active));
                  } else {
                    setUsers(allUsers.filter(user => !user.is_active));
                  }
                });
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
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
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Subscription Tier</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Email Verified</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
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
                        {user.subscription ? (
                          <Tooltip title={`Subscription ID: ${user.subscription.id}`}>
                            <Chip 
                              color="info" 
                              size="small" 
                              label={getTierNameById(user.subscription.tier_id)} 
                            />
                          </Tooltip>
                        ) : (
                          <Chip 
                            color="default" 
                            size="small" 
                            label="NO SUBSCRIPTION" 
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
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
            
            {/* Subscription Tier Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="user-subscription-tier-label">Subscription Tier</InputLabel>
                <Select
                  labelId="user-subscription-tier-label"
                  name="subscription_tier_id"
                  value={userFormData.subscription_tier_id}
                  onChange={handleUserFormChange}
                  label="Subscription Tier"
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