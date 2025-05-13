import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Button, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import { CheckCircleOutline, Cancel } from '@mui/icons-material';
import { getSubscriptionTiers, getUserSubscription } from '../services/subscription';
import { useAuth } from '../context/AuthContext';

const SubscriptionTiers = () => {
  const [tiers, setTiers] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all subscription tiers
        const tiersData = await getSubscriptionTiers();
        setTiers(tiersData);
        
        // If user is authenticated, fetch their subscription
        if (isAuthenticated) {
          try {
            const userSubData = await getUserSubscription();
            setUserSubscription(userSubData);
          } catch (subError) {
            console.error('Error fetching user subscription:', subError);
            // If 404, user might not have a subscription yet
            if (subError.response && subError.response.status === 404) {
              setUserSubscription(null);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Format price from cents to dollars
  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Get the user's current tier
  const getCurrentTier = () => {
    if (!userSubscription || !tiers.length) return null;
    return tiers.find(tier => tier.id === userSubscription.tier_id);
  };

  const currentTier = getCurrentTier();

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading subscription information...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* User's Current Subscription (if authenticated) */}
      {isAuthenticated && (
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>
            Your Subscription
          </Typography>
          
          {currentTier ? (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {currentTier.name} Plan
                {userSubscription.is_active ? (
                  <Chip 
                    label="Active" 
                    color="success" 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                ) : (
                  <Chip 
                    label="Inactive" 
                    color="error" 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>
              
              <Typography variant="body1" gutterBottom>
                {currentTier.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Started: {new Date(userSubscription.starts_at).toLocaleDateString()}
                  </Typography>
                  
                  {userSubscription.expires_at && (
                    <Typography variant="body2" color="text.secondary">
                      Expires: {new Date(userSubscription.expires_at).toLocaleDateString()}
                    </Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">
                    {formatPrice(currentTier.price_monthly)}/month
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    or {formatPrice(currentTier.price_yearly)}/year
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
              <Typography variant="body1">
                You are currently on the Free plan.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upgrade to a paid plan to access more features and higher limits.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Available Subscription Tiers */}
      <Typography variant="h5" gutterBottom>
        Available Plans
      </Typography>
      
      <Grid container spacing={3}>
        {tiers.map((tier) => (
          <Grid item xs={12} md={4} key={tier.id}>
            <Card 
              elevation={3} 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: currentTier && currentTier.id === tier.id ? '2px solid #1976d2' : 'none'
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="div" gutterBottom>
                  {tier.name}
                </Typography>
                
                <Typography variant="h4" component="div" gutterBottom>
                  {formatPrice(tier.price_monthly)}
                  <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                    /month
                  </Typography>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  or {formatPrice(tier.price_yearly)}/year
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {tier.description}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <List dense>
                  {Object.entries(tier.features).map(([feature, value]) => (
                    <ListItem key={feature} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {value === true ? (
                          <CheckCircleOutline color="success" />
                        ) : value === false ? (
                          <Cancel color="error" />
                        ) : (
                          <CheckCircleOutline color="success" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature} 
                        secondary={
                          typeof value !== 'boolean' ? value : null
                        } 
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              
              <Box sx={{ p: 2, mt: 'auto' }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  disabled={!isAuthenticated || (currentTier && currentTier.id === tier.id)}
                >
                  {currentTier && currentTier.id === tier.id ? 'Current Plan' : 'Choose Plan'}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SubscriptionTiers;