import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  useTheme,
  Paper
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import ApiIcon from '@mui/icons-material/Api';

const Landing = () => {
  const theme = useTheme();

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary
    }}>
      {/* Hero Section */}
      <Box 
        sx={{
          pt: 8,
          pb: 6,
          background: theme.palette.mode === 'dark' 
            ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
            : `linear-gradient(180deg, #f5f7fa 0%, #fff 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom>
                Network Diagnostics Made Simple
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph>
                ProbeOps delivers comprehensive network diagnostics through intelligent, 
                cloud-native APIs for automation and observability.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Button 
                  component={Link} 
                  to="/dashboard" 
                  variant="contained" 
                  size="large" 
                  color="primary"
                  sx={{ mr: 2 }}
                >
                  Get Started
                </Button>
                <Button 
                  component={Link} 
                  to="/docs" 
                  variant="outlined" 
                  size="large"
                >
                  API Docs
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box 
                component="img"
                src="/placeholder-hero.svg"
                alt="Network Diagnostics"
                sx={{ 
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  display: 'block',
                  margin: '0 auto' 
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Problems We Solve */}
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Problems We Solve
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
          Enterprise network diagnostics shouldn't be complicated
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <SpeedIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Slow Troubleshooting
                </Typography>
                <Typography variant="body1">
                  Replace manual SSH and CLI tools with automated, API-first diagnostics.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <SecurityIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Complex Debugging
                </Typography>
                <Typography variant="body1">
                  Simplify network visibility with structured data that's automation-friendly.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <ApiIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Siloed Tools
                </Typography>
                <Typography variant="body1">
                  Unify network diagnostics in one platform with both GUI and API access.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Who It's For */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Who It's For
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
            Purpose-built for modern network operations teams
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  DevOps Engineers
                </Typography>
                <Typography variant="body1">
                  Integrate network diagnostics directly into CI/CD pipelines and automation workflows.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  Network Administrators
                </Typography>
                <Typography variant="body1">
                  Quickly diagnose issues with an intuitive dashboard and exportable reports.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  AI/ML Engineers
                </Typography>
                <Typography variant="body1">
                  Feed structured network data into AI agents for predictive maintenance.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Key Features */}
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Key Features
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
          Everything you need for network diagnostics
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="JSON Responses"
                subheader="Structured data for easy parsing"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  All diagnostic results return clean, consistent JSON for simple integration.
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    overflow: 'auto',
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {`{
  "status": "success",
  "latency_ms": 42,
  "hops": 4,
  "destination": "api.example.com"
}`}
                  </pre>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="AI Agent Ready"
                subheader="Perfect for automation"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Clean API endpoints with consistent schemas for LLM agents and automation tools.
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    overflow: 'auto',
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <code>
                    {`# LangChain example
from langchain import ProbeOpsAgent

agent = ProbeOpsAgent(api_key="YOUR_KEY")
result = agent.run_diagnostic("ping", "api.example.com")`}
                  </code>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="Manual Probes"
                subheader="No coding required"
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Use our intuitive dashboard for ad-hoc diagnostics and scheduled probes.
                </Typography>
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    height: '125px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Typography variant="body2" color="text.secondary" align="center">
                    [Dashboard Interface Preview]
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Live API Example */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Live API Example
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
            Try our diagnostic endpoints
          </Typography>
          
          <Grid container spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Run a quick ping test
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
                <Button variant="contained" disabled>
                  Try It (Coming Soon)
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Summary */}
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Pricing
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
          Simple, transparent pricing for all needs
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 4 }} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              border: `1px solid ${theme.palette.primary.main}`
            }}>
              <CardHeader
                title="Free"
                subheader="For personal use"
                titleTypographyProps={{ align: 'center' }}
                subheaderTypographyProps={{ align: 'center' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'baseline', 
                  mb: 2 
                }}>
                  <Typography component="h2" variant="h3" color="text.primary">
                    $0
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    /mo
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <ul style={{ paddingInlineStart: '20px' }}>
                  <li>Basic ping diagnostics</li>
                  <li>Basic DNS lookups</li>
                  <li>Traceroute</li>
                  <li>History retention: 7 days</li>
                  <li>Community support</li>
                </ul>
              </CardContent>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button 
                  component={Link}
                  to="/pricing"
                  fullWidth 
                  variant="outlined"
                >
                  Learn More
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            component={Link}
            to="/pricing"
            variant="contained"
            size="large"
          >
            View All Plans
          </Button>
        </Box>
      </Container>

      {/* Testimonials */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', py: 8 }}>
        <Container maxWidth="md">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Testimonials
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
            What our users are saying
          </Typography>
          
          <Box sx={{ 
            p: 4, 
            bgcolor: 'background.paper', 
            borderRadius: 2,
            mt: 4,
            boxShadow: 1
          }}>
            <Typography variant="body1" sx={{ fontStyle: 'italic' }} paragraph>
              "ProbeOps has transformed how we handle network diagnostics. What used to take hours now takes minutes, and the API integration with our automation tools is seamless."
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  mr: 2
                }}
              >
                JS
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Jane Smith
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  DevOps Lead, TechCorp
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer CTA */}
      <Box sx={{ bgcolor: theme.palette.primary.main, color: 'white', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
            Ready to simplify network diagnostics?
          </Typography>
          <Typography variant="h6" textAlign="center" color="white" paragraph sx={{ opacity: 0.9 }}>
            Join thousands of engineers who are saving time with ProbeOps
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              component={Link}
              to="/dashboard"
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;