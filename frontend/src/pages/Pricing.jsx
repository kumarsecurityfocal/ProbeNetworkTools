import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  Chip
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const Pricing = () => {
  const theme = useTheme();
  const [annual, setAnnual] = useState(false);

  const handleBillingChange = () => {
    setAnnual(!annual);
  };

  // Pricing tiers based on the CSV file with annual discount
  const tiers = [
    {
      title: 'Free (Starter)',
      subheader: 'For personal use',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { name: 'Max Active Probes', detail: '3', included: true },
        { name: 'Max API Keys', detail: '1', included: true },
        { name: 'API Calls/Day', detail: '25', included: true },
        { name: 'API Calls/Month', detail: '500', included: true },
        { name: 'Allowed Probe Intervals', detail: '15m, 1h, 1d', included: true },
        { name: 'History Retention', detail: '7 days', included: true },
        { name: 'Export Capability', included: false },
        { name: 'Scheduled Probes', detail: '1', included: true },
        { name: 'Alerting', included: false },
        { name: 'Usage Stats', detail: 'Basic', included: true },
        { name: 'Diagnostic Types', detail: 'Ping, Traceroute', included: true },
        { name: 'Priority Support', detail: 'Community only', included: true },
      ],
      buttonText: 'Login/Sign Up Free',
      buttonVariant: 'outlined',
    },
    {
      title: 'Standard (Pro)',
      subheader: 'For professionals',
      monthlyPrice: 19.99,
      annualPrice: 191.90, // $19.99 * 12 = $239.88, with 20% discount = $191.90
      discount: 20,
      features: [
        { name: 'Max Active Probes', detail: '10', included: true },
        { name: 'Max API Keys', detail: '10', included: true },
        { name: 'API Calls/Day', detail: '200', included: true },
        { name: 'API Calls/Month', detail: '5000', included: true },
        { name: 'Allowed Probe Intervals', detail: '5m, 15m, 1h, 1d', included: true },
        { name: 'History Retention', detail: '30 days', included: true },
        { name: 'Export Capability', detail: 'Yes (CSV)', included: true },
        { name: 'Scheduled Probes', detail: '5', included: true },
        { name: 'Alerting', detail: 'Email', included: true },
        { name: 'Usage Stats', detail: 'Detailed per probe', included: true },
        { name: 'Diagnostic Types', detail: 'Ping, Traceroute, DNS, WHOIS', included: true },
        { name: 'Priority Support', detail: 'Email', included: true },
      ],
      buttonText: 'Login/Sign Up',
      buttonVariant: 'contained',
      highlight: true,
    },
    {
      title: 'Enterprise (OpsEdge)',
      subheader: 'For organizations',
      monthlyPrice: 49.99,
      annualPrice: 479.90, // $49.99 * 12 = $599.88, with 20% discount = $479.90
      discount: 20,
      features: [
        { name: 'Max Active Probes', detail: '50', included: true },
        { name: 'Max API Keys', detail: '20', included: true },
        { name: 'API Calls/Day', detail: '1000', included: true },
        { name: 'API Calls/Month', detail: '15000', included: true },
        { name: 'Allowed Probe Intervals', detail: '5m, 15m, 1h, 1d', included: true },
        { name: 'History Retention', detail: '90 days', included: true },
        { name: 'Export Capability', detail: 'Yes (CSV)', included: true },
        { name: 'Scheduled Probes', detail: '20', included: true },
        { name: 'Alerting', detail: 'Email + Webhook (Coming Soon)', included: true },
        { name: 'Usage Stats', detail: 'Full analytics + export', included: true },
        { name: 'Diagnostic Types', detail: 'All tools incl. curl, reverse DNS', included: true },
        { name: 'Priority Support', detail: 'Email + Chat (Coming Soon)', included: true },
      ],
      buttonText: 'Contact us',
      buttonVariant: 'outlined',
    },
  ];

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary,
      py: 8
    }}>
      <Container maxWidth="lg">
        <Typography variant="h2" component="h1" align="center" gutterBottom fontWeight="bold">
          Pricing
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Choose the right plan for your needs
        </Typography>

        <Box sx={{ my: 5, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={annual}
                onChange={handleBillingChange}
                color="primary"
              />
            }
            label={
              <Typography variant="body1">
                {annual ? 'Annual billing' : 'Monthly billing'}
                {annual && (
                  <Chip
                    label="Save 20%"
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            }
          />
        </Box>

        {/* Tier Cards */}
        <Grid container spacing={4} alignItems="flex-end">
          {tiers.map((tier) => (
            <Grid
              item
              key={tier.title}
              xs={12}
              sm={tier.title === 'Enterprise' ? 12 : 6}
              md={4}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: tier.highlight 
                    ? `2px solid ${theme.palette.primary.main}` 
                    : `1px solid ${theme.palette.divider}`,
                  ...(tier.highlight && {
                    boxShadow: `0 8px 24px ${theme.palette.mode === 'dark' 
                      ? 'rgba(0,0,0,0.4)' 
                      : 'rgba(0,0,0,0.12)'}`
                  }),
                }}
              >
                <CardHeader
                  title={tier.title}
                  subheader={tier.subheader}
                  titleTypographyProps={{ align: 'center', fontWeight: 'bold' }}
                  subheaderTypographyProps={{ align: 'center' }}
                  sx={{
                    bgcolor: tier.highlight 
                      ? theme.palette.mode === 'dark' 
                        ? theme.palette.primary.dark 
                        : theme.palette.primary.light 
                      : 'inherit',
                    color: tier.highlight && theme.palette.mode === 'dark' ? 'white' : 'inherit',
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'baseline',
                      mb: 2,
                    }}
                  >
                    {tier.monthlyPrice === 0 ? (
                      <Typography component="h2" variant="h3" color="text.primary">
                        Free
                      </Typography>
                    ) : (
                      <>
                        <Typography component="h2" variant="h3" color="text.primary">
                          ${annual ? (tier.annualPrice).toFixed(2) : (tier.monthlyPrice).toFixed(2)}
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                          {annual ? '/year' : '/mo'}
                        </Typography>
                      </>
                    )}
                  </Box>
                  
                  {/* Show per month price if on annual plan */}
                  {annual && tier.monthlyPrice > 0 && (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'success.main' }}>
                        Save 20% with annual billing
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        (equiv. to ${(tier.annualPrice / 12).toFixed(2)}/mo)
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <ul style={{ paddingInlineStart: '20px' }}>
                    {tier.features.map((feature) => (
                      <Typography
                        component="li"
                        variant="subtitle1"
                        align="left"
                        key={feature.name}
                        sx={{ my: 1 }}
                      >
                        {feature.name}
                        {feature.detail && `: ${feature.detail}`}
                        {!feature.included && (
                          <CloseIcon color="error" sx={{ fontSize: 'small', ml: 1, verticalAlign: 'middle' }} />
                        )}
                      </Typography>
                    ))}
                  </ul>
                </CardContent>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button
                    component={Link}
                    to={tier.title.includes('Free') ? '/app' : 
                       tier.title.includes('Enterprise') ? '/contact' : '/app'}
                    fullWidth
                    variant={tier.buttonVariant}
                    color={tier.highlight ? 'primary' : 'primary'}
                  >
                    {tier.buttonText}
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Feature Comparison Table */}
        <Typography variant="h4" align="center" sx={{ mt: 10, mb: 4 }}>
          Feature Comparison
        </Typography>
        <TableContainer component={Paper} sx={{ mt: 4, mb: 8, overflow: 'auto' }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Feature</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Free (Starter)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Standard (Pro)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Enterprise (OpsEdge)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">Max Active Probes</TableCell>
                <TableCell align="center">3</TableCell>
                <TableCell align="center">10</TableCell>
                <TableCell align="center">50</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Max API Keys</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center">10</TableCell>
                <TableCell align="center">20</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">API Calls/Day</TableCell>
                <TableCell align="center">25</TableCell>
                <TableCell align="center">200</TableCell>
                <TableCell align="center">1000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">API Calls/Month</TableCell>
                <TableCell align="center">500</TableCell>
                <TableCell align="center">5000</TableCell>
                <TableCell align="center">15000</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Allowed Probe Intervals</TableCell>
                <TableCell align="center">15m, 1h, 1d</TableCell>
                <TableCell align="center">5m, 15m, 1h, 1d</TableCell>
                <TableCell align="center">5m, 15m, 1h, 1d</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">History Retention</TableCell>
                <TableCell align="center">7 days</TableCell>
                <TableCell align="center">30 days</TableCell>
                <TableCell align="center">90 days</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Export Capability</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center">Yes (CSV)</TableCell>
                <TableCell align="center">Yes (CSV)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Scheduled Probes</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center">5</TableCell>
                <TableCell align="center">20</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Alerting</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center">Email</TableCell>
                <TableCell align="center">Email + Webhook (Coming Soon)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Usage Stats</TableCell>
                <TableCell align="center">Basic</TableCell>
                <TableCell align="center">Detailed per probe</TableCell>
                <TableCell align="center">Full analytics + export</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Diagnostic Types</TableCell>
                <TableCell align="center">Ping, Traceroute</TableCell>
                <TableCell align="center">Ping, Traceroute, DNS, WHOIS</TableCell>
                <TableCell align="center">All tools incl. curl, reverse DNS</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Priority Support</TableCell>
                <TableCell align="center">Community only</TableCell>
                <TableCell align="center">Email</TableCell>
                <TableCell align="center">Email + Chat (Coming Soon)</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Price (Monthly)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>$0</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>$19.99</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>$49.99</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Price (Annual)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>$0</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    $191.90
                    <Typography variant="caption" sx={{ display: 'block', color: 'success.main' }}>
                      Save 20%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    $479.90
                    <Typography variant="caption" sx={{ display: 'block', color: 'success.main' }}>
                      Save 20%
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* FAQ Section */}
        <Typography variant="h4" align="center" sx={{ mt: 6, mb: 4 }}>
          Frequently Asked Questions
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Can I upgrade or downgrade my plan?
            </Typography>
            <Typography variant="body1" paragraph>
              Yes, you can change your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the end of your billing cycle.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Do you offer custom plans?
            </Typography>
            <Typography variant="body1" paragraph>
              Yes, our Enterprise plan is fully customizable. Contact our sales team to discuss your specific requirements and we'll tailor a solution for you.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              How secure is my data?
            </Typography>
            <Typography variant="body1" paragraph>
              All data is encrypted in transit. We follow security best practices to protect your diagnostic data and credentials, and are continuously improving our platform's security.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              What payment methods do you accept?
            </Typography>
            <Typography variant="body1" paragraph>
              We accept all major credit cards, and for Enterprise customers, we can arrange for invoicing and purchase orders.
            </Typography>
          </Grid>
        </Grid>

        {/* Call to Action */}
        <Box sx={{ 
          bgcolor: theme.palette.primary.main, 
          color: 'white', 
          p: 6, 
          borderRadius: 2, 
          mt: 8,
          textAlign: 'center'
        }}>
          <Typography variant="h4" gutterBottom>
            Ready to try ProbeOps?
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            Choose the plan that's right for you
          </Typography>
          <Button 
            component={Link}
            to="/app"
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
            Login/Sign Up Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Pricing;