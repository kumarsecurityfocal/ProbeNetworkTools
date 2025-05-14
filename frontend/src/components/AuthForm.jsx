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
  
  // Custom styles for input fields - Airtable inspired
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      backgroundColor: '#fcfcfc',
      transition: 'all 0.2s ease',
      border: '1px solid #eaecef',
      '&:hover': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#1890ff',
          borderWidth: '1px',
        }
      }
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.95rem',
      '&.Mui-focused': {
        color: '#1890ff',
      },
    },
    '& .MuiInputBase-input': {
      padding: '14px 14px',
    },
    my: 1.5
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" style={{ backgroundColor: '#f9fafc' }}>
      <Container maxWidth="sm" className="py-8">
        <div className="flex flex-col items-center mb-6">
          <Logo size="xl" />
          <Typography 
            variant="h4" 
            component="h1" 
            className="font-bold mt-4 text-center text-gray-800"
            sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' }}
          >
            ProbeOps
          </Typography>

        </div>
        
        <Paper 
          elevation={0} 
          className="p-8 w-full rounded-xl"
          sx={{ 
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(224, 224, 255, 0.4)',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <Typography 
            component="h2" 
            variant="h5" 
            align="center" 
            className="font-semibold mb-6"
            sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: '#111827' }}
          >
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Typography>
          
          {apiError && (
            <Alert 
              severity="error" 
              className="mb-6"
              sx={{ 
                borderRadius: '8px',
                backgroundColor: 'rgba(254, 226, 226, 0.6)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#ef4444'
                }
              }}
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
                    <PersonIcon sx={{ color: '#9ca3af' }} />
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
                      <EmailIcon sx={{ color: '#9ca3af' }} />
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
                    <LockIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: '#9ca3af' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            {isLogin && (
              <Box className="flex justify-end mt-1 mb-2">
                <Link 
                  component={RouterLink} 
                  to="/forgot-password"
                  sx={{ 
                    fontSize: '0.875rem', 
                    color: '#1890ff',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
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
                mt: 3,
                mb: 2,
                borderRadius: "8px",
                padding: "12px 0",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500,
                backgroundColor: '#1890ff',
                '&:hover': {
                  backgroundColor: '#0c6ddd',
                },
                boxShadow: '0 2px 0 rgba(0, 0, 0, 0.043)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, color: '#9ca3af', fontSize: '0.85rem' }}>
                OR
              </Typography>
            </Divider>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  className="mb-3"
                  sx={{ 
                    borderRadius: "8px",
                    padding: "10px 0",
                    textTransform: "none",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    borderColor: '#e5e7eb',
                    color: '#4b5563',
                    backgroundColor: '#ffffff',
                    '&:hover': {
                      borderColor: '#d1d5db',
                      backgroundColor: '#f9fafb'
                    },
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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
              <Typography variant="body2" sx={{ color: '#6b7280', fontFamily: '"Inter", sans-serif' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link 
                  component={RouterLink} 
                  to={isLogin ? "/register" : "/login"}
                  sx={{ 
                    color: '#1890ff', 
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        <Typography 
          variant="body2" 
          align="center" 
          sx={{ 
            mt: 3, 
            color: 'rgba(55, 65, 81, 0.7)',
            fontSize: '0.85rem',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          By using ProbeOps, you agree to our <Link sx={{ color: '#1890ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Terms of Service</Link> and <Link sx={{ color: '#1890ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Privacy Policy</Link>.
        </Typography>
      </Container>
    </div>
  );
};

export default AuthForm;
