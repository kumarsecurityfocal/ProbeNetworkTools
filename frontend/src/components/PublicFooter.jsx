import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';

const PublicFooter = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', path: '/' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'Documentation', path: '/docs' },
        { name: 'API Reference', path: '/docs' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About', path: '/about' },
        { name: 'Blog', path: '/blog' },
        { name: 'Careers', path: '/about' },
        { name: 'Contact', path: '/contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Knowledge Base', path: '/docs' },
        { name: 'Status Page', path: '/docs' },
        { name: 'Support', path: '/contact' },
        { name: 'Terms of Service', path: '/about' }
      ]
    }
  ];

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: 2,
        mt: 'auto',
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo and Description */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'text.primary',
                textDecoration: 'none',
                display: 'inline-block',
                mb: 2
              }}
            >
              ProbeOps
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Comprehensive network diagnostics for modern teams. Simplify troubleshooting with intuitive tools and API-first design.
            </Typography>
            <Box>
              <IconButton 
                aria-label="Twitter" 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <TwitterIcon />
              </IconButton>
              <IconButton 
                aria-label="LinkedIn" 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <LinkedInIcon />
              </IconButton>
              <IconButton 
                aria-label="GitHub" 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <GitHubIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Links */}
          {footerLinks.map((section) => (
            <Grid item xs={12} sm={6} md={2} key={section.title}>
              <Typography variant="subtitle1" color="text.primary" gutterBottom fontWeight="bold">
                {section.title}
              </Typography>
              <Box>
                {section.links.map((link) => (
                  <Box key={link.name} sx={{ mb: 1 }}>
                    <Link
                      component={RouterLink}
                      to={link.path}
                      color="text.secondary"
                      underline="hover"
                    >
                      {link.name}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}

          {/* Newsletter Signup */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom fontWeight="bold">
              Stay Updated
            </Typography>
            <Link
              component={RouterLink}
              to="/contact"
              color="primary"
              underline="hover"
            >
              Subscribe to our newsletter
            </Link>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Copyright */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            © {currentYear} ProbeOps. All rights reserved.
          </Typography>
          <Box>
            <Link
              component={RouterLink}
              to="/about"
              color="text.secondary"
              underline="hover"
              sx={{ mx: 1 }}
            >
              Privacy Policy
            </Link>
            <Link
              component={RouterLink}
              to="/about"
              color="text.secondary"
              underline="hover"
              sx={{ mx: 1 }}
            >
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicFooter;