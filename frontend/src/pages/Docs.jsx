import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const Docs = () => {
  const theme = useTheme();

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary,
      py: 8
    }}>
      <Container maxWidth="lg">
        <Typography variant="h2" component="h1" align="center" gutterBottom fontWeight="bold">
          Documentation
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Our API and integration documentation is coming soon
        </Typography>

        {/* Coming Soon Message */}
        <Paper 
          sx={{ 
            p: 6, 
            my: 6, 
            textAlign: 'center',
            background: theme.palette.mode === 'dark' 
              ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.dark} 100%)` 
              : `linear-gradient(135deg, #f5f7fa 0%, ${theme.palette.primary.light} 100%)`,
          }}
        >
          <MenuBookIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Coming Soon!
          </Typography>
          <Typography variant="h6" paragraph>
            We're currently working on comprehensive documentation for our API and integrations.
          </Typography>
          <Typography variant="body1" paragraph>
            In the meantime, you can explore our platform through the dashboard or contact us for technical questions.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button 
              component={Link} 
              to="/dashboard" 
              variant="contained" 
              size="large" 
              sx={{ mr: 2 }}
            >
              Go to Dashboard
            </Button>
            <Button 
              component={Link} 
              to="/contact" 
              variant="outlined" 
              size="large"
            >
              Contact Support
            </Button>
          </Box>
        </Paper>

        {/* Documentation Categories Preview */}
        <Typography variant="h4" align="center" sx={{ mt: 10, mb: 4 }}>
          What to Expect in Our Documentation
        </Typography>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <CodeIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  Getting Started
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Easy-to-follow guides for setting up authentication, creating API tokens, and making your first API call.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <IntegrationInstructionsIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  API Reference
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed documentation for all endpoints, request parameters, response formats, and examples.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <AutoFixHighIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  Integrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Guides for integrating with popular tools like n8n, LangChain, GitHub Actions, and more.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <MenuBookIcon color="primary" sx={{ fontSize: 40, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  Tutorials
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Step-by-step tutorials for common use cases, automation patterns, and advanced configurations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* API Sneak Peek */}
        <Typography variant="h4" align="center" sx={{ mt: 10, mb: 4 }}>
          API Sneak Peek
        </Typography>

        <Paper sx={{ p: 3, mb: 6, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Example: Running a Ping Diagnostic
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f0f0f0',
              borderRadius: 1,
              mb: 2,
              overflow: 'auto'
            }}
          >
            <code>
              {`curl -X POST https://api.probeops.com/v1/diagnostic/ping \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"target": "api.example.com", "count": 4}'`}
            </code>
          </Box>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
            Example Response:
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#f0f0f0',
              borderRadius: 1,
              overflow: 'auto'
            }}
          >
            <pre style={{ margin: 0 }}>
              {`{
  "id": "diag_12345abcde",
  "timestamp": "2025-05-14T12:34:56Z",
  "status": "success",
  "tool": "ping",
  "target": "api.example.com",
  "results": {
    "packets_sent": 4,
    "packets_received": 4,
    "packet_loss_percent": 0,
    "rtt_min_ms": 23.456,
    "rtt_avg_ms": 25.789,
    "rtt_max_ms": 28.123,
    "rtt_mdev_ms": 1.234
  }
}`}
            </pre>
          </Box>
        </Paper>

        {/* Email Signup for Documentation Updates */}
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', 
          p: 4, 
          borderRadius: 2, 
          mt: 6,
          textAlign: 'center'
        }}>
          <Typography variant="h5" gutterBottom>
            Be the first to know when our documentation is ready
          </Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            Sign up to receive updates on our documentation and API features
          </Typography>
          <Button 
            component={Link}
            to="/contact"
            variant="contained" 
            size="large"
          >
            Join Our Mailing List
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Docs;