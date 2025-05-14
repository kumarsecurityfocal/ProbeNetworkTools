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
  CardMedia,
  CardActionArea,
  Divider,
  useTheme,
} from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import EmailIcon from '@mui/icons-material/Email';

const Blog = () => {
  const theme = useTheme();

  // Placeholder blog posts ideas (to be implemented in the future)
  const futurePosts = [
    {
      title: 'Best Practices for Network Diagnostics',
      description: 'Learn how to set up effective diagnostic processes that save time and reduce downtime.',
      category: 'Best Practices',
      imageText: 'Network Diagnostics'
    },
    {
      title: 'Using ProbeOps API with LangChain',
      description: 'Integrate network diagnostics into your AI agents and workflows with this step-by-step guide.',
      category: 'Automation',
      imageText: 'AI Integration'
    },
    {
      title: 'Automating Network Tests in CI/CD Pipelines',
      description: "Ensure your deployments don't break connectivity by adding diagnostics to your CI/CD process.",
      category: 'DevOps',
      imageText: 'CI/CD Pipelines'
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
          Blog
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Best practices, automation tips, and AI integration tutorials
        </Typography>

        {/* Coming Soon Banner */}
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
          <BookIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Coming Soon!
          </Typography>
          <Typography variant="h6" paragraph>
            We're working on creating valuable content to help you get the most out of ProbeOps.
          </Typography>
          <Typography variant="body1" paragraph>
            Our blog will feature technical guides, best practices, case studies, and integration tutorials.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button 
              component={Link} 
              to="/contact" 
              variant="contained" 
              size="large"
              startIcon={<EmailIcon />}
            >
              Get Notified When We Launch
            </Button>
          </Box>
        </Paper>

        {/* Preview of Future Content */}
        <Typography variant="h4" align="center" sx={{ mt: 10, mb: 2 }}>
          What to Expect
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" paragraph>
          Here's a sneak peek at the type of content we're preparing
        </Typography>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          {futurePosts.map((post, index) => (
            <Grid item key={index} xs={12} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea disabled>
                  <CardMedia
                    component="div"
                    sx={{
                      pt: '56.25%', // 16:9 aspect ratio
                      bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      align="center" 
                      sx={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        color: theme.palette.mode === 'dark' ? 'white' : 'primary.contrastText',
                      }}
                    >
                      {post.imageText}
                    </Typography>
                  </CardMedia>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                      {post.category}
                    </Typography>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {post.title}
                    </Typography>
                    <Typography variant="body2">
                      {post.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Categories */}
        <Typography variant="h4" align="center" sx={{ mt: 10, mb: 4 }}>
          Content Categories
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Best Practices
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Expert recommendations for network diagnostics, monitoring, and troubleshooting workflows.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Tutorials
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Step-by-step guides to help you master ProbeOps features and integrations.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Automation
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Guides for integrating ProbeOps with CI/CD pipelines, AI agents, and automation tools.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Case Studies
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Real-world examples of how organizations use ProbeOps to solve complex challenges.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Subscribe */}
        <Box sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#f5f7fa', 
          p: 4, 
          borderRadius: 2, 
          mt: 8,
          textAlign: 'center'
        }}>
          <RssFeedIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Stay updated
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Be the first to know when we publish new content
          </Typography>
          <Button 
            component={Link}
            to="/contact"
            variant="contained" 
            size="large"
            startIcon={<EmailIcon />}
          >
            Subscribe for Updates
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Blog;