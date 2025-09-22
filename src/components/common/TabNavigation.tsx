import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as StatusIcon,
  AutoAwesome as BuildKnowledgeIcon,
  Visibility as VisualizeIcon,
} from '@mui/icons-material';

// All tabs in a simple flat array
const allTabs = [
  { label: 'Status', path: '/status', icon: <StatusIcon /> },
  { label: 'Build Knowledge', path: '/build-knowledge', icon: <BuildKnowledgeIcon /> },
  { label: 'Visualize', path: '/visualize', icon: <VisualizeIcon /> },
];

const TabNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Box sx={{
      backgroundColor: '#000000',  // Black background to match header
      px: isSmallScreen ? 1 : 2,
      py: isSmallScreen ? 0.5 : 1,
      overflow: 'hidden'
    }}>
      {/* Single row of tabs that wraps naturally */}
      <Tabs
        value={location.pathname}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: isSmallScreen ? 36 : 48,
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
            height: 2,
          },
          '& .MuiTabs-flexContainer': {
            flexWrap: 'wrap',  // Allow tabs to wrap naturally
          },
          '& .MuiTab-root': {
            minHeight: isSmallScreen ? 36 : 48,
            minWidth: 'auto',
            fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
            textTransform: 'none',
            color: '#969696',  // Grey text on black
            backgroundColor: 'transparent',
            border: 'none',
            px: isSmallScreen ? 1 : 1.5,
            py: isSmallScreen ? 0.5 : 0.75,
            '&.Mui-selected': {
              color: '#ffffff',  // White when selected
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
            '& .MuiTab-iconWrapper': {
              marginRight: isSmallScreen ? 0.5 : 1,
              marginBottom: 0,
            }
          }
        }}
      >
        {allTabs.map((tab) => (
          <Tab
            key={tab.path}
            label={tab.label}
            value={tab.path}
            icon={tab.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default TabNavigation;
