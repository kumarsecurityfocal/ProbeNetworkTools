import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  FormHelperText, 
  IconButton, 
  Divider, 
  Chip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  Save as SaveIcon, 
  AccountCircle as AccountCircleIcon, 
  Security as SecurityIcon, 
  VpnKey as VpnKeyIcon, 
  Payments as PaymentsIcon, 
  Timeline as TimelineIcon, 
  Edit as EditIcon 
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword, 
  resendVerificationEmail,
  logoutAllDevices,
  getApiKeys, 
  createApiKey, 
  deleteApiKey 
} from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with relativeTime
dayjs.extend(relativeTime);

// Time zone options for dropdown
const TIME_ZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Europe/Paris', label: 'CET (Central European Time)' },
  { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' }
];

// Date format options
const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
];

const UserProfile = () => {
  const { user, refreshUserProfile } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    job_title: '',
    time_zone: 'UTC',
    date_format: 'YYYY-MM-DD'
  });
  
  // Security tab state
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // API Keys tab state
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyExpiry, setNewApiKeyExpiry] = useState(30); // 30 days default
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // For avatar upload
  const [avatarUploadDialog, setAvatarUploadDialog] = useState(false);
  
  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userData = await getUserProfile();
        
        // Set profile data with user data or defaults
        setProfileData({
          username: userData.username || '',
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          company: userData.company || '',
          job_title: userData.job_title || '',
          time_zone: userData.time_zone || 'UTC',
          date_format: userData.date_format || 'YYYY-MM-DD'
        });
      } catch (error) {
        showSnackbar(`Error loading profile: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);
  
  // Fetch API keys when on API Keys tab
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (tabValue === 2) { // API Keys tab
        try {
          setApiKeyLoading(true);
          const keys = await getApiKeys();
          setApiKeys(keys);
        } catch (error) {
          showSnackbar(`Error loading API keys: ${error.message}`, 'error');
        } finally {
          setApiKeyLoading(false);
        }
      }
    };
    
    fetchApiKeys();
  }, [tabValue]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle profile data change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };
  
  // Handle security data change
  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData({
      ...securityData,
      [name]: value
    });
  };
  
  // Save profile data
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await updateUserProfile(profileData);
      await refreshUserProfile(); // Refresh user data in auth context
      showSnackbar('Profile updated successfully');
    } catch (error) {
      showSnackbar(`Error saving profile: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Change password
  const handleChangePassword = async () => {
    // Validate passwords
    if (securityData.new_password !== securityData.confirm_password) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }
    
    try {
      setLoading(true);
      await changePassword(securityData.current_password, securityData.new_password);
      showSnackbar('Password changed successfully');
      
      // Clear password fields
      setSecurityData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      showSnackbar(`Error changing password: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new API key
  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      showSnackbar('Please enter a name for the API key', 'error');
      return;
    }
    
    try {
      setApiKeyLoading(true);
      const newKey = await createApiKey({
        name: newApiKeyName,
        expires_days: newApiKeyExpiry
      });
      
      // Add new key to list
      setApiKeys([newKey, ...apiKeys]);
      
      // Clear form
      setNewApiKeyName('');
      
      showSnackbar('API key created successfully');
    } catch (error) {
      showSnackbar(`Error creating API key: ${error.message}`, 'error');
    } finally {
      setApiKeyLoading(false);
    }
  };
  
  // Delete API key
  const handleDeleteApiKey = async (keyId) => {
    try {
      setApiKeyLoading(true);
      await deleteApiKey(keyId);
      
      // Remove deleted key from list
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      
      showSnackbar('API key deleted successfully');
    } catch (error) {
      showSnackbar(`Error deleting API key: ${error.message}`, 'error');
    } finally {
      setApiKeyLoading(false);
    }
  };
  
  // Show snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  // Format date for display
  const formatDate = (date) => {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  };
  
  // Render profile tab content
  const renderProfileTab = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar 
            sx={{ width: 120, height: 120, mb: 2 }}
            alt={profileData.username}
          >
            {profileData.username ? profileData.username[0].toUpperCase() : 'U'}
          </Avatar>
          
          <Button 
            variant="outlined" 
            startIcon={<EditIcon />}
            sx={{ mb: 2 }}
            onClick={() => setAvatarUploadDialog(true)}
          >
            Change Photo
          </Button>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
            Account created: {user?.created_at ? formatDate(user.created_at) : 'N/A'}
          </Typography>
          
          <Chip 
            label={user?.is_admin ? 'Admin' : 'User'} 
            color={user?.is_admin ? 'primary' : 'default'}
            sx={{ mb: 1 }}
          />
          
          {!user?.email_verified && (
            <Button 
              variant="outlined" 
              color="warning" 
              size="small" 
              sx={{ mt: 1 }}
              onClick={async () => {
                try {
                  await resendVerificationEmail();
                  showSnackbar('Verification email sent successfully. Please check your inbox.');
                } catch (error) {
                  showSnackbar(`Error sending verification email: ${error.message}`, 'error');
                }
              }}
            >
              Verify Email
            </Button>
          )}
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={profileData.username}
                onChange={handleProfileChange}
                InputProps={{
                  readOnly: user?.oauth_provider != null
                }}
                helperText={user?.oauth_provider ? "Username cannot be changed for OAuth accounts" : ""}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={profileData.email}
                InputProps={{
                  readOnly: !user?.is_admin
                }}
                helperText={!user?.is_admin ? "Only administrators can change email addresses" : ""}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={profileData.first_name}
                onChange={handleProfileChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={profileData.last_name}
                onChange={handleProfileChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company"
                name="company"
                value={profileData.company}
                onChange={handleProfileChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Job Title"
                name="job_title"
                value={profileData.job_title}
                onChange={handleProfileChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="time-zone-label">Time Zone</InputLabel>
                <Select
                  labelId="time-zone-label"
                  name="time_zone"
                  value={profileData.time_zone}
                  label="Time Zone"
                  onChange={handleProfileChange}
                >
                  {TIME_ZONES.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="date-format-label">Date Format</InputLabel>
                <Select
                  labelId="date-format-label"
                  name="date_format"
                  value={profileData.date_format}
                  label="Date Format"
                  onChange={handleProfileChange}
                >
                  {DATE_FORMATS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
              >
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Render security tab content
  const renderSecurityTab = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Change Password
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              name="current_password"
              value={securityData.current_password}
              onChange={handleSecurityChange}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              name="new_password"
              value={securityData.new_password}
              onChange={handleSecurityChange}
              helperText="Password must be at least 8 characters with numbers and special characters"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              name="confirm_password"
              value={securityData.confirm_password}
              onChange={handleSecurityChange}
              error={securityData.new_password !== securityData.confirm_password && securityData.confirm_password !== ''}
              helperText={securityData.new_password !== securityData.confirm_password && securityData.confirm_password !== '' ? "Passwords do not match" : ""}
            />
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleChangePassword}
              disabled={!securityData.current_password || !securityData.new_password || !securityData.confirm_password}
            >
              Update Password
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Account Activity
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Last Login</Typography>
          <Typography variant="body2">
            {user?.last_login ? dayjs(user.last_login).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Last Password Change</Typography>
          <Typography variant="body2">
            {user?.last_password_change ? dayjs(user.last_password_change).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
          </Typography>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="outlined" 
            color="error"
            onClick={async () => {
              try {
                setLoading(true);
                await logoutAllDevices();
                showSnackbar('Successfully logged out from all other devices');
              } catch (error) {
                showSnackbar(`Error: ${error.message}`, 'error');
              } finally {
                setLoading(false);
              }
            }}
          >
            Log Out From All Devices
          </Button>
        </Box>
      </Paper>
    </Box>
  );
  
  // Render API keys tab content
  const renderApiKeysTab = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create New API Key
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="API Key Name"
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
              placeholder="e.g., Development, Production, CI/CD"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="expiry-label">Expires After</InputLabel>
              <Select
                labelId="expiry-label"
                value={newApiKeyExpiry}
                label="Expires After"
                onChange={(e) => setNewApiKeyExpiry(e.target.value)}
              >
                <MenuItem value={7}>7 Days</MenuItem>
                <MenuItem value={30}>30 Days</MenuItem>
                <MenuItem value={90}>90 Days</MenuItem>
                <MenuItem value={365}>1 Year</MenuItem>
                <MenuItem value={0}>Never</MenuItem>
              </Select>
              <FormHelperText>
                For security, it's recommended to set an expiration date
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleCreateApiKey}
              disabled={!newApiKeyName.trim() || apiKeyLoading}
            >
              {apiKeyLoading ? <CircularProgress size={24} /> : 'Create API Key'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiKeyLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No API keys found. Create your first key above.
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell>
                      {key.key ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {key.key.substring(0, 8)}...
                          </Typography>
                          <IconButton size="small" onClick={() => {
                            navigator.clipboard.writeText(key.key);
                            showSnackbar('API key copied to clipboard');
                          }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Hidden for security
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(key.created_at)}</TableCell>
                    <TableCell>
                      {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small" 
                        onClick={() => handleDeleteApiKey(key.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
  
  // Render subscription tab content
  const renderSubscriptionTab = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Current Subscription
          </Typography>
          
          <Chip 
            label={user?.subscription?.tier?.name || 'FREE'} 
            color={
              user?.subscription?.tier?.name === 'ENTERPRISE' ? 'primary' :
              user?.subscription?.tier?.name === 'STANDARD' ? 'secondary' :
              'default'
            }
          />
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2">Subscription Status</Typography>
            <Typography variant="body1">
              {user?.subscription?.is_active ? 'Active' : 'Inactive'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2">Start Date</Typography>
            <Typography variant="body1">
              {user?.subscription?.starts_at ? formatDate(user?.subscription?.starts_at) : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2">Renews On</Typography>
            <Typography variant="body1">
              {user?.subscription?.expires_at ? formatDate(user?.subscription?.expires_at) : 'N/A'}
            </Typography>
          </Grid>
        </Grid>
        
        {user?.subscription?.tier?.name !== 'ENTERPRISE' && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary"
            >
              Upgrade Subscription
            </Button>
          </Box>
        )}
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Usage Limits
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">API Rate Limit (per minute)</Typography>
              <Typography variant="body1">
                {user?.subscription?.tier?.rate_limit_minute || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">API Rate Limit (per hour)</Typography>
              <Typography variant="body1">
                {user?.subscription?.tier?.rate_limit_hour || 'N/A'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Max Scheduled Probes</Typography>
              <Typography variant="body1">
                {user?.subscription?.tier?.max_scheduled_probes || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Max API Keys</Typography>
              <Typography variant="body1">
                {user?.subscription?.tier?.max_api_keys || 'N/A'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
  
  // Render API usage tab content
  const renderApiUsageTab = () => (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          API Usage Statistics
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          API usage statistics functionality is available for Standard and Enterprise tier subscribers.
        </Alert>
        
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained"
            color="primary"
          >
            Upgrade to View API Usage
          </Button>
        </Box>
      </Paper>
    </Box>
  );
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      
      <Paper sx={{ p: 0 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<AccountCircleIcon />} 
            label="Profile" 
            id="profile-tab"
            aria-controls="profile-panel"
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="Security" 
            id="security-tab"
            aria-controls="security-panel"
          />
          <Tab 
            icon={<VpnKeyIcon />} 
            label="API Tokens" 
            id="api-tokens-tab"
            aria-controls="api-tokens-panel"
          />
          <Tab 
            icon={<PaymentsIcon />} 
            label="Subscription" 
            id="subscription-tab"
            aria-controls="subscription-panel"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="API Usage" 
            id="api-usage-tab"
            aria-controls="api-usage-panel"
          />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <div>
              {tabValue === 0 && renderProfileTab()}
              {tabValue === 1 && renderSecurityTab()}
              {tabValue === 2 && renderApiKeysTab()}
              {tabValue === 3 && renderSubscriptionTab()}
              {tabValue === 4 && renderApiUsageTab()}
            </div>
          )}
        </Box>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Avatar Upload Dialog */}
      <Dialog open={avatarUploadDialog} onClose={() => setAvatarUploadDialog(false)}>
        <DialogTitle>Change Profile Picture</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a new profile picture. The image should be square and will be cropped if necessary.
          </DialogContentText>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="avatar-upload-button"
              type="file"
            />
            <label htmlFor="avatar-upload-button">
              <Button variant="contained" component="span">
                Choose File
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Recommended size: 256x256 pixels, max 1MB
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarUploadDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // This would be where the upload happens
              showSnackbar('Feature coming soon: Profile picture upload');
              setAvatarUploadDialog(false);
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfile;