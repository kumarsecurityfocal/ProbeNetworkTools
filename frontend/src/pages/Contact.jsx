import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  MenuItem,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import BusinessIcon from '@mui/icons-material/Business';

const Contact = () => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Here you would typically send the form data to your backend
    console.log('Form data submitted:', formData);
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Your message has been sent! We\'ll get back to you soon.',
      severity: 'success'
    });
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
      inquiryType: 'general'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary,
      py: 8
    }}>
      <Container maxWidth="lg">
        <Typography variant="h2" component="h1" align="center" gutterBottom fontWeight="bold">
          Contact Us
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Got a question? Want a demo? We're here to help!
        </Typography>

        <Grid container spacing={6} sx={{ mt: 4 }}>
          {/* Contact Form */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h4" gutterBottom>
                Send us a message
              </Typography>
              <Typography variant="body1" paragraph>
                Fill out the form below and we'll get back to you as soon as possible.
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Your Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="Inquiry Type"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                    >
                      <MenuItem value="general">General Question</MenuItem>
                      <MenuItem value="sales">Sales Inquiry</MenuItem>
                      <MenuItem value="support">Technical Support</MenuItem>
                      <MenuItem value="demo">Request a Demo</MenuItem>
                      <MenuItem value="feedback">Feedback</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Message"
                      name="message"
                      multiline
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      size="large"
                      endIcon={<SendIcon />}
                    >
                      Send Message
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>
          
          {/* Contact Information */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 4, mb: 4 }}>
              <Typography variant="h4" gutterBottom>
                Contact Information
              </Typography>
              <Typography variant="body1" paragraph>
                Prefer to reach us directly? Use one of these methods:
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmailIcon sx={{ fontSize: 24, mr: 2, color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    <a href="mailto:hello@probeops.com" style={{ color: theme.palette.primary.main }}>
                      hello@probeops.com
                    </a>
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SupportAgentIcon sx={{ fontSize: 24, mr: 2, color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Support
                  </Typography>
                  <Typography variant="body1">
                    <a href="mailto:support@probeops.com" style={{ color: theme.palette.primary.main }}>
                      support@probeops.com
                    </a>
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ fontSize: 24, mr: 2, color: theme.palette.primary.main }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Sales
                  </Typography>
                  <Typography variant="body1">
                    <a href="mailto:sales@probeops.com" style={{ color: theme.palette.primary.main }}>
                      sales@probeops.com
                    </a>
                  </Typography>
                </Box>
              </Box>
            </Paper>
            
            {/* FAQ */}
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Frequently Asked Questions
              </Typography>
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3 }}>
                How soon will I get a response?
              </Typography>
              <Typography variant="body2" paragraph>
                We aim to respond to all inquiries within 24 hours during business days.
              </Typography>
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                Can I schedule a demo?
              </Typography>
              <Typography variant="body2" paragraph>
                Yes! Select "Request a Demo" in the inquiry type dropdown and we'll arrange a personalized demonstration.
              </Typography>
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
                I need help with my account
              </Typography>
              <Typography variant="body2" paragraph>
                For account-specific issues, please include your username or email address in your message.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Contact;