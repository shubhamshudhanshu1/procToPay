import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Custom Tabs Component matching the design exactly
 * @param {Array} tabs - Array of tab objects with { label, value } or array of strings
 * @param {*} value - Current active tab value
 * @param {Function} onChange - Callback when tab changes (value) => void
 * @param {Object} sx - Additional styles
 */
const CustomTabs = ({ tabs, value, onChange, sx = {} }) => {
  // Normalize tabs to array of objects
  const normalizedTabs = tabs.map((tab) =>
    typeof tab === 'string' ? { label: tab, value: tab } : tab
  );

  return (
    <Box
      sx={{
        display: 'flex',
        backgroundColor: '#F5F5F5',
        padding: '4px',
        borderRadius: '4px',
        gap: '4px',
        minHeight: 'auto',
        ...sx,
      }}
    >
      {normalizedTabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <Box
            key={tab.value}
            onClick={() => onChange(tab.value)}
            sx={{
              flex: 1,
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              borderRadius: '4px 4px 0 0',
              padding: '8px 16px',
              minHeight: 32,
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
              },
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#212529' : '#9E9E9E',
                textTransform: 'none',
                letterSpacing: 'normal',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default CustomTabs;
