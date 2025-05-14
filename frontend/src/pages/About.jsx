import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  Avatar,
  useTheme
} from '@mui/material';
import EngineeringIcon from '@mui/icons-material/Engineering';
import HistoryIcon from '@mui/icons-material/History';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';

const About = () => {
  const theme = useTheme();

  // Placeholder team members
  const teamMembers = [
    {
      name: 'Jane Doe',
      role: 'CEO & Founder',
      bio: 'Former network engineer with 15 years of experience building enterprise diagnostics tools.',
      initials: 'JD'
    },
    {
      name: 'John Smith',
      role: 'CTO',
      bio: 'Expert in API design and distributed systems with a background in cloud infrastructure.',
      initials: 'JS'
    },
    {
      name: 'Alex Johnson',
      role: 'Lead Developer',
      bio: 'Full-stack engineer specialized in high-performance backend systems and automation.',
      initials: 'AJ'
    }
  ];

  return (
    <Box sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : '#fff',
      color: theme.palette.text.primary,
      py: 8
    }}>
      <Container maxWidth="lg">
        <Typography variant="h2" component="h1" align="center" gutterBottom fontWeight="bold">
          About ProbeOps
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Modernizing network diagnostics for the cloud-native era
        </Typography>

        {/* Our Story */}
        <Box sx={{ my: 8 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" gutterBottom>
                Our Story
              </Typography>
              <Typography variant="body1" paragraph>
                ProbeOps was created by engineers tired of digging through logs and using outdated tools for network diagnostics. We believe that network troubleshooting should be fast, accessible, and automation-friendly.
              </Typography>
              <Typography variant="body1" paragraph>
                Founded in 2023, we set out to build the diagnostics platform we always wished we had – one that combines the power of modern APIs with an intuitive dashboard, designed from the ground up for both humans and automation systems.
              </Typography>
              <Typography variant="body1">
                Today, we're helping organizations of all sizes streamline their network diagnostics, reduce troubleshooting time, and integrate proactive monitoring into their workflows.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark' 
                    ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.dark} 100%)` 
                    : `linear-gradient(135deg, #f5f7fa 0%, ${theme.palette.primary.light} 100%)`,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <HistoryIcon sx={{ fontSize: 100, color: theme.palette.primary.main, mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    From frustration to innovation
                  </Typography>
                  <Typography variant="body1">
                    We turned our own network troubleshooting challenges into an elegant solution for everyone.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Our Mission */}
        <Box 
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa',
            py: 6,
            px: 4,
            borderRadius: 2,
            my: 8
          }}
        >
          <Typography variant="h3" align="center" gutterBottom>
            Our Mission
          </Typography>
          <Typography variant="h6" align="center" paragraph>
            We're on a mission to make network diagnostics accessible, intuitive, and automation-friendly for organizations of all sizes.
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <EngineeringIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    Simplify Troubleshooting
                  </Typography>
                  <Typography variant="body2">
                    Reduce the time and complexity of network diagnostics through intuitive tools and structured data.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <IntegrationInstructionsIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    Enable Automation
                  </Typography>
                  <Typography variant="body2">
                    Build a platform where both humans and machines can easily diagnose network issues.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <WorkspacePremiumIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    Raise the Standard
                  </Typography>
                  <Typography variant="body2">
                    Establish a new benchmark for what network diagnostics tools should be in the cloud era.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Our Team */}
        <Typography variant="h3" align="center" gutterBottom>
          Our Team
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph>
          Meet the folks behind ProbeOps
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {teamMembers.map((member, index) => (
            <Grid item key={index} xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      width: 80,
                      height: 80,
                      fontSize: 32,
                      margin: '0 auto 16px'
                    }}
                  >
                    {member.initials}
                  </Avatar>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {member.name}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {member.role}
                  </Typography>
                  <Typography variant="body2">
                    {member.bio}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
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
            Join us on our journey
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 4 }}>
            Experience the future of network diagnostics today
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
              },
              mr: 2
            }}
          >
            Start Now
          </Button>
          <Button 
            component={Link}
            to="/contact"
            variant="outlined" 
            size="large"
            sx={{ 
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Contact Us
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default About;