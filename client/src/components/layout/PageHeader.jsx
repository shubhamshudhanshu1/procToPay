import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

const PageHeader = ({ title, subtitle, actionLabel, onAction, actionIcon, showCreateButton, ...rest }) => {
  // Filter out props that shouldn't be passed to DOM elements
  const boxProps = { ...rest };
  // Remove any non-standard props that might cause warnings
  delete boxProps.showCreateButton;
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 3,
      }}
      {...boxProps}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: subtitle ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actionLabel && onAction && (
        <Button variant="contained" startIcon={actionIcon || <Add />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default PageHeader;

