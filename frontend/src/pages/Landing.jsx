import React, { useState } from 'react';
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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Chip,
  useMediaQuery,
  alpha,
  Switch
} from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import ApiIcon from '@mui/icons-material/Api';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HandymanIcon from '@mui/icons-material/Handyman';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ComputerIcon from '@mui/icons-material/Computer';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DataObjectIcon from '@mui/icons-material/DataObject';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';

const Landing = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [copied, setCopied] = useState(false);
  
  // Tab state for the API example
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Copy to clipboard function for the API example
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Pricing table data from CSV with annual discount
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const pricingTiers = [
    {
      name: "Free (Starter)",
      monthlyPrice: "$0",
      annualPrice: "$0",
      features: [
        { name: "Max Active Probes", value: "3" },
        { name: "Max API Keys", value: "1" },
        { name: "API Calls/Day", value: "25" },
        { name: "API Calls/Month", value: "500" },
        { name: "Allowed Probe Intervals", value: "15m, 1h, 1d" },
        { name: "History Retention", value: "7 days" },
        { name: "Export Capability", value: false },
        { name: "Scheduled Probes", value: "1" },
        { name: "Alerting", value: false },
        { name: "Usage Stats", value: "Basic" },
        { name: "Diagnostic Types", value: "Ping, Traceroute" },
        { name: "Priority Support", value: "Community only" }
      ]
    },
    {
      name: "Standard (Pro)",
      monthlyPrice: "$19.99",
      annualPrice: "$191.90", // $19.99 * 12 = $239.88, with 20% discount = $191.90
      highlight: true,
      features: [
        { name: "Max Active Probes", value: "10" },
        { name: "Max API Keys", value: "10" },
        { name: "API Calls/Day", value: "200" },
        { name: "API Calls/Month", value: "5000" },
        { name: "Allowed Probe Intervals", value: "5m, 15m, 1h, 1d" },
        { name: "History Retention", value: "30 days" },
        { name: "Export Capability", value: "Yes (CSV)" },
        { name: "Scheduled Probes", value: "5" },
        { name: "Alerting", value: "Email" },
        { name: "Usage Stats", value: "Detailed per probe" },
        { name: "Diagnostic Types", value: "Ping, Traceroute, DNS, WHOIS" },
        { name: "Priority Support", value: "Email" }
      ]
    },
    {
      name: "Enterprise (OpsEdge)",
      monthlyPrice: "$49.99",
      annualPrice: "$479.90", // $49.99 * 12 = $599.88, with 20% discount = $479.90
      features: [
        { name: "Max Active Probes", value: "50" },
        { name: "Max API Keys", value: "20" },
        { name: "API Calls/Day", value: "1000" },
        { name: "API Calls/Month", value: "15000" },
        { name: "Allowed Probe Intervals", value: "5m, 15m, 1h, 1d" },
        { name: "History Retention", value: "90 days" },
        { name: "Export Capability", value: "Yes (CSV)" },
        { name: "Scheduled Probes", value: "20" },
        { name: "Alerting", value: "Email + Webhook (Coming Soon)" },
        { name: "Usage Stats", value: "Full analytics + export" },
        { name: "Diagnostic Types", value: "All tools incl. curl, reverse DNS" },
        { name: "Priority Support", value: "Email + Chat (Coming Soon)" }
      ]
    }
  ];

  // The curl command to display and copy
  const curlCommand = `curl https://probeops.com/ping \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "target": "example.com" }'`;
  
  // JSON response example
  const jsonResponse = `{
  "target": "example.com",
  "latency_ms": 42,
  "status": "reachable"
}`;

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary
    }}>
      {/* Hero Section */}
      <Box 
        sx={{
          pt: { xs: 6, md: 8 },
          pb: { xs: 4, md: 6 },
          background: theme.palette.mode === 'dark' 
            ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
            : `linear-gradient(180deg, #f5f7fa 0%, #fff 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                component="h1" 
                fontWeight="bold" 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  lineHeight: 1.2 
                }}
              >
                🚀 API-First Network Diagnostics
                <Box component="span" sx={{ display: 'block' }}>
                  Built for AI Agents & Automation
                </Box>
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                paragraph
                sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
              >
                Trigger Ping, DNS, Traceroute, or WHOIS with a simple API call.
                Get JSON results instantly — for DevOps workflows, LLM agents, and monitoring systems.
              </Typography>
              <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Button 
                  component={Link} 
                  to="/app" 
                  variant="contained" 
                  size="large" 
                  color="primary"
                  startIcon={<SpeedIcon />}
                >
                  Login/Sign Up Free
                </Button>
                <Button 
                  component={Link} 
                  to="/docs" 
                  variant="outlined" 
                  size="large"
                  startIcon={<CodeIcon />}
                >
                  Explore the API
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
                  margin: '0 auto',
                  borderRadius: 2,
                  boxShadow: 3 
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* The Problem We Solve (Before/After) */}
      <Container sx={{ py: { xs: 5, md: 8 } }} maxWidth="lg">
        <Typography 
          variant="h3" 
          component="h2" 
          textAlign="center" 
          gutterBottom
          sx={{ mb: 3 }}
        >
          The Problem We Solve
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                height: '100%', 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,0,0,0.05)' : 'rgba(255,0,0,0.03)',
              }}
            >
              <Typography 
                variant="h5" 
                component="h3" 
                gutterBottom
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: theme.palette.error.main
                }}
              >
                <CloseIcon sx={{ mr: 1 }} /> Without ProbeOps
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" paragraph sx={{ mt: 2 }}>
                  "Why did curl timeout on prod?"
                </Typography>
                <Typography component="li" variant="body1" paragraph>
                  "Why is DNS breaking but I have no logs?"
                </Typography>
                <Typography component="li" variant="body1" paragraph>
                  "My AI agent says 'API failed' — but why?"
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                height: '100%', 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,255,0,0.05)' : 'rgba(0,255,0,0.03)',
              }}
            >
              <Typography 
                variant="h5" 
                component="h3" 
                gutterBottom
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: theme.palette.success.main 
                }}
              >
                <CheckIcon sx={{ mr: 1 }} /> With ProbeOps
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" paragraph sx={{ mt: 2 }}>
                  Run structured probes via API or GUI
                </Typography>
                <Typography component="li" variant="body1" paragraph>
                  Parse JSON responses in agents or scripts
                </Typography>
                <Typography component="li" variant="body1" paragraph>
                  Visualize status in dashboards
                </Typography>
                <Typography component="li" variant="body1" paragraph>
                  Schedule checks or run instantly
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Who It's For */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Who Is It For?
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SmartToyIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h3">
                      AI Agents / LLM Workflows
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    Run probes as part of Langchain or Flowise actions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HandymanIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h3">
                      DevOps & SREs
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    Add diagnostics into GitHub Actions, Jenkins, etc.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AutorenewIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h3">
                      Automation Engineers
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    Use in n8n, Make, Zapier — get structured data back
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: `2px solid ${theme.palette.primary.main}`, 
                boxShadow: 3
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ComputerIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" component="h3">
                      Manual Testing Teams
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    Use GUI to run ad-hoc probes without writing code
                  </Typography>
                  <Chip 
                    label="Highlight" 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 2 }} 
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Key Features */}
      <Container sx={{ py: { xs: 5, md: 8 } }} maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Key Features
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <DataObjectIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    JSON Output for All Diagnostics
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <SmartToyIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    AI Agent-Ready Endpoints
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <VpnKeyIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    API Key Auth + Rate Limits
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    Probe Intervals: 5m, 15m, 1h, 1d
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ 
              height: '100%',
              border: `2px solid ${theme.palette.primary.main}`,
              boxShadow: 3
            }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <ComputerIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    Manual Probe via GUI
                  </Typography>
                  <Chip 
                    label="User-friendly" 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <QueryStatsIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    Usage Stats & History
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <IntegrationInstructionsIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    Multiple Diagnostic Types
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <ApiIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                    Simple RESTful API
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Live API Example */}
      <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', py: { xs: 5, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Live API Example
          </Typography>
          
          <Grid container spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            <Grid item xs={12} md={8}>
              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(45deg, #1a1a2e 0%, #16213e 100%)'
                    : 'linear-gradient(45deg, #1a1a2e 0%, #16213e 100%)',
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CodeIcon sx={{ mr: 1 }} />
                    API Request Example
                  </Typography>
                  <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    sx={{ 
                      '& .MuiTab-root': { 
                        color: 'rgba(255,255,255,0.7)',
                        '&.Mui-selected': {
                          color: 'white'
                        }
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: 'white'
                      }
                    }}
                  >
                    <Tab label="curl" />
                    <Tab label="Response" />
                  </Tabs>
                </Box>
                
                <Box hidden={tabValue !== 0}>
                  <Box
                    sx={{
                      position: 'relative',
                      p: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      mb: 2
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {curlCommand}
                    </pre>
                    <IconButton
                      onClick={() => copyToClipboard(curlCommand)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'white',
                        opacity: 0.7,
                        '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                      size="small"
                    >
                      {copied ? <CheckIcon /> : <ContentCopyIcon />}
                    </IconButton>
                  </Box>
                </Box>
                
                <Box hidden={tabValue !== 1}>
                  <Box
                    sx={{
                      position: 'relative',
                      p: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      mb: 2
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {jsonResponse}
                    </pre>
                    <IconButton
                      onClick={() => copyToClipboard(jsonResponse)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'white',
                        opacity: 0.7,
                        '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                      size="small"
                    >
                      {copied ? <CheckIcon /> : <ContentCopyIcon />}
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Preview */}
      <Container sx={{ py: { xs: 5, md: 8 } }} maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Pricing Preview
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
          Simple plans for every team size
        </Typography>
        
        {/* Billing Toggle */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          mb: 4,
          mt: 2
        }}>
          <Typography variant="body1" color={billingCycle === 'monthly' ? 'primary' : 'text.secondary'}>
            Monthly
          </Typography>
          <Switch
            checked={billingCycle === 'annual'}
            onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            color="primary"
            sx={{ mx: 1 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" color={billingCycle === 'annual' ? 'primary' : 'text.secondary'}>
              Annual
            </Typography>
            <Chip 
              label="Save 20%" 
              color="success" 
              size="small" 
              sx={{ 
                ml: 1,
                height: 20,
                fontSize: '0.7rem',
                visibility: billingCycle === 'annual' ? 'visible' : 'hidden'
              }} 
            />
          </Box>
        </Box>
        
        <Grid container spacing={3} sx={{ mt: 2 }} justifyContent="center">
          {pricingTiers.map((tier, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: tier.highlight 
                  ? `2px solid ${theme.palette.primary.main}` 
                  : `1px solid ${theme.palette.divider}`,
                boxShadow: tier.highlight ? 4 : 1,
                position: 'relative',
                overflow: 'visible'
              }}>
                {tier.highlight && (
                  <Chip
                    label="Most Popular"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }}
                  />
                )}
                <CardHeader
                  title={tier.name.split(' ')[0]}
                  subheader={tier.name.includes('(') ? tier.name.match(/\((.*)\)/)[1] : null}
                  titleTypographyProps={{ align: 'center', variant: 'h5' }}
                  subheaderTypographyProps={{ align: 'center' }}
                  sx={{
                    bgcolor: tier.highlight 
                      ? theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.primary.main, 0.1)
                      : 'transparent'
                  }}
                />
                <CardContent sx={{ flexGrow: 1, px: 2 }}>
                  {/* Price with monthly/annual toggle */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'baseline', 
                    mb: 3
                  }}>
                    <Typography component="h2" variant="h3" color="text.primary">
                      {billingCycle === 'monthly' ? tier.monthlyPrice : tier.annualPrice}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 0.5 }}>
                      {billingCycle === 'monthly' ? '/mo' : '/year'}
                    </Typography>
                  </Box>
                  
                  {/* Show per month price if on annual plan (except for free tier) */}
                  {billingCycle === 'annual' && tier.monthlyPrice !== "$0" && (
                    <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mb: 2 }}>
                      (equivalent to {`$${(parseFloat(tier.annualPrice.replace('$', '')) / 12).toFixed(2)}`}/mo)
                    </Typography>
                  )}
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Show the top features from CSV */}
                  {tier.features.slice(0, 5).map((feature, idx) => (
                    <Box 
                      key={idx}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        py: 0.75
                      }}
                    >
                      {typeof feature.value === 'boolean' ? (
                        feature.value ? 
                          <CheckIcon color="success" sx={{ mr: 1, fontSize: 20 }} /> : 
                          <CloseIcon color="error" sx={{ mr: 1, fontSize: 20 }} />
                      ) : (
                        feature.value === "No" ? 
                          <CloseIcon color="error" sx={{ mr: 1, fontSize: 20 }} /> :
                          <ArrowForwardIosIcon sx={{ mr: 1, fontSize: 14, color: theme.palette.primary.main }} />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
                          {feature.name}:
                        </Box>
                        {' '}
                        {typeof feature.value === 'boolean' ? '' : 
                          (feature.value === "No" || feature.value === false) ? '' : feature.value}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button 
                    component={Link}
                    to="/pricing"
                    fullWidth 
                    variant={tier.highlight ? "contained" : "outlined"}
                    color="primary"
                  >
                    {tier.highlight ? "Get Started" : "Learn More"}
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            component={Link}
            to="/pricing"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIosIcon />}
          >
            View Full Pricing Details
          </Button>
        </Box>
      </Container>

      {/* Footer CTA */}
      <Box sx={{ bgcolor: theme.palette.primary.main, color: 'white', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
            Ready to simplify network diagnostics?
          </Typography>
          <Typography variant="h6" textAlign="center" color="white" paragraph sx={{ opacity: 0.9 }}>
            Join teams who are saving time with ProbeOps
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
              Login/Sign Up Free
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;