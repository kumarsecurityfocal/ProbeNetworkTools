import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Link, 
  Paper, 
  Container, 
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  Grid
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff,
  LockOutlined as LockIcon,
  EmailOutlined as EmailIcon,
  PersonOutline as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const AuthForm = ({ mode }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isLogin = mode === 'login';
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
    
    // Clear API error when user makes any change
    if (apiError) setApiError('');
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!isLogin) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    setApiError('');
    
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        navigate('/dashboard');
      } else {
        await register(formData.username, formData.email, formData.password);
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setApiError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Custom styles for input fields
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#4285F4',
        borderWidth: '2px',
      }
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#4285F4',
    },
    my: 1.5
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <Container maxWidth="sm" className="py-8">
        <div className="flex flex-col items-center mb-8">
          <Logo size="xl" />
          <Typography 
            variant="h4" 
            component="h1" 
            className="font-bold mt-6 text-center text-gray-800"
            sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700 }}
          >
            ProbeOps
          </Typography>
          <Typography 
            variant="body1" 
            className="text-gray-600 mt-2"
          >
            Network Diagnostics Platform
          </Typography>
        </div>
        
        <Paper 
          elevation={0} 
          className="p-8 w-full rounded-2xl"
          sx={{ 
            boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.08)',
            borderRadius: '24px',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}
        >
          <Typography 
            component="h2" 
            variant="h5" 
            align="center" 
            className="font-semibold mb-6"
            sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, color: '#202124' }}
          >
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Typography>
          
          {apiError && (
            <Alert 
              severity="error" 
              className="mb-6 rounded-lg"
              sx={{ borderRadius: '10px' }}
            >
              {apiError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username}
              disabled={loading}
              sx={inputStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            {!isLogin && (
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
                sx={inputStyles}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            
            <TextField
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
              sx={inputStyles}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {isLogin && (
              <Box className="flex justify-end mt-1 mb-4">
                <Link 
                  component={RouterLink} 
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-800"
                  sx={{ fontSize: '0.875rem' }}
                >
                  Forgot password?
                </Link>
              </Box>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              className="mt-4 mb-4"
              sx={{ 
                borderRadius: "8px",
                padding: "12px 0",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500,
                backgroundColor: '#4285F4',
                '&:hover': {
                  backgroundColor: '#3367d6',
                },
                boxShadow: '0 2px 4px rgba(66, 133, 244, 0.3)'
              }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
            
            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                OR
              </Typography>
            </Divider>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  className="mb-3"
                  sx={{ 
                    borderRadius: "8px",
                    padding: "10px 0",
                    textTransform: "none",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    borderColor: '#dadce0',
                    color: '#3c4043',
                    '&:hover': {
                      borderColor: '#4285F4',
                      backgroundColor: 'rgba(66, 133, 244, 0.04)'
                    }
                  }}
                  startIcon={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                      <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    </Box>
                  }
                >
                  Continue with Google
                </Button>
              </Grid>
            </Grid>
            
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body2" className="text-gray-700">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link 
                  component={RouterLink} 
                  to={isLogin ? "/register" : "/login"}
                  className="text-primary-600 font-medium hover:text-primary-800"
                  sx={{ fontWeight: 500 }}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          By using ProbeOps, you agree to our <Link color="primary" underline="hover">Terms of Service</Link> and <Link color="primary" underline="hover">Privacy Policy</Link>.
        </Typography>
      </Container>
    </div>
  );
};

export default AuthForm;
