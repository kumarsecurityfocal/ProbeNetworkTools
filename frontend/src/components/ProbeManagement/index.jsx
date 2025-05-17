import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { 
  SettingsRemote as NodesIcon,
  VpnKey as TokensIcon,
  List as ListIcon,
} from '@mui/icons-material';
import SimpleProbeNodesManagement from './SimpleProbeNodesManagement';
import SimpleTokenGenerator from './SimpleTokenGenerator';
import TokenManagement from './TokenManagement';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`probe-tabpanel-${index}`}
      aria-labelledby={`probe-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProbeManagement = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Probe Management
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="probe management tabs"
        >
          <Tab icon={<NodesIcon />} label="Probe Nodes" />
          <Tab icon={<TokensIcon />} label="Generate Tokens" />
          <Tab icon={<ListIcon />} label="Manage Tokens" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <SimpleProbeNodesManagement />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <SimpleTokenGenerator />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <TokenManagement />
      </TabPanel>
    </Box>
  );
};

export default ProbeManagement;