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

  const tiers = [
    {
      title: 'Free',
      subheader: 'For personal use',
      price: 0,
      features: [
        { name: 'Basic ping diagnostics', included: true },
        { name: 'Basic DNS lookups', included: true },
        { name: 'Traceroute', included: true },
        { name: 'History retention', detail: '7 days', included: true },
        { name: 'API access', included: false },
        { name: 'Scheduled probes', included: false },
        { name: 'Export capabilities', included: false },
        { name: 'Alerting', included: false },
        { name: 'API rate limits', detail: '10/min, 100/hour', included: true },
        { name: 'Support', detail: 'Community', included: true },
      ],
      buttonText: 'Sign up for free',
      buttonVariant: 'outlined',
    },
    {
      title: 'Standard',
      subheader: 'For professionals',
      price: annual ? 39 : 49,
      discount: annual ? 20 : 0,
      features: [
        { name: 'Basic ping diagnostics', included: true },
        { name: 'Basic DNS lookups', included: true },
        { name: 'Traceroute', included: true },
        { name: 'History retention', detail: '30 days', included: true },
        { name: 'API access', included: true },
        { name: 'Scheduled probes', included: true },
        { name: 'Export capabilities', included: true },
        { name: 'Alerting', included: false },
        { name: 'API rate limits', detail: '60/min, 1000/hour', included: true },
        { name: 'Support', detail: 'Email', included: true },
      ],
      buttonText: 'Get started',
      buttonVariant: 'contained',
      highlight: true,
    },
    {
      title: 'Enterprise',
      subheader: 'For organizations',
      price: 'Custom',
      features: [
        { name: 'Basic ping diagnostics', included: true },
        { name: 'Basic DNS lookups', included: true },
        { name: 'Traceroute', included: true },
        { name: 'History retention', detail: '1 year', included: true },
        { name: 'API access', included: true },
        { name: 'Scheduled probes', included: true },
        { name: 'Export capabilities', included: true },
        { name: 'Alerting', included: true },
        { name: 'API rate limits', detail: 'Custom', included: true },
        { name: 'Support', detail: 'Priority', included: true },
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
                    {typeof tier.price === 'number' ? (
                      <>
                        <Typography component="h2" variant="h3" color="text.primary">
                          ${tier.price}
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          /mo
                        </Typography>
                      </>
                    ) : (
                      <Typography component="h2" variant="h3" color="text.primary">
                        {tier.price}
                      </Typography>
                    )}
                  </Box>
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
                    to={tier.title === 'Free' ? '/dashboard' : 
                       tier.title === 'Enterprise' ? '/contact' : '/dashboard'}
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
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Feature</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Free</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Standard</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Enterprise</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">Ping Diagnostics</TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">DNS Lookups</TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Traceroute</TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">History Retention</TableCell>
                <TableCell align="center">7 days</TableCell>
                <TableCell align="center">30 days</TableCell>
                <TableCell align="center">1 year</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">API Access</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Scheduled Probes</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Export Capabilities</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Alerting</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">API Rate Limits</TableCell>
                <TableCell align="center">10/min, 100/hour</TableCell>
                <TableCell align="center">60/min, 1000/hour</TableCell>
                <TableCell align="center">Custom</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Support</TableCell>
                <TableCell align="center">Community</TableCell>
                <TableCell align="center">Email</TableCell>
                <TableCell align="center">Priority</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Custom Interval Probes</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">Multi-user Access</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">SSO Integration</TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CloseIcon color="error" /></TableCell>
                <TableCell align="center"><CheckIcon color="success" /></TableCell>
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
              All data is encrypted in transit and at rest. We implement industry-standard security practices and regular security audits to ensure your diagnostic data remains secure.
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
            Ready to get started?
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            Choose the plan that's right for you
          </Typography>
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
            Sign Up Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Pricing;