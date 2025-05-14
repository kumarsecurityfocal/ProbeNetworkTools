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
  InputAdornment 
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
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
  const title = isLogin ? 'Sign In' : 'Create an Account';
  
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
  
  return (
    <Container maxWidth="sm" className="pt-20 pb-10">
      <Box className="flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <Logo size="lg" />
          <Typography 
            variant="h4" 
            component="h1" 
            className="font-bold mt-4 text-center text-gray-800"
          >
            ProbeOps
          </Typography>
          <Typography 
            variant="body1" 
            className="text-gray-600 mt-2"
          >
            Network diagnostics platform
          </Typography>
        </div>
        
        <Paper 
          elevation={3} 
          className="p-8 w-full rounded-xl shadow-card"
          sx={{ 
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
            borderRadius: '16px'
          }}
        >
          <Typography 
            component="h2" 
            variant="h5" 
            align="center" 
            gutterBottom
            className="font-semibold mb-6"
          >
            {title}
          </Typography>
          
          {apiError && (
            <Alert 
              severity="error" 
              className="mb-4 rounded-lg"
            >
              {apiError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
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
              sx={{ mb: 2 }}
            />
            
            {!isLogin && (
              <TextField
                margin="normal"
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
                sx={{ mb: 2 }}
              />
            )}
            
            <TextField
              margin="normal"
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
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              className="py-3 text-base font-medium mt-4 mb-4"
              sx={{ 
                borderRadius: "10px",
                py: 1.5,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 500
              }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" className="text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link 
                  component={RouterLink} 
                  to={isLogin ? "/register" : "/login"}
                  className="text-primary-600 font-medium hover:text-primary-700"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthForm;
