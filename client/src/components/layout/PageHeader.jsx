import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

const PageHeader = ({ 
  title, 
  subtitle, 
  actionLabel, 
  onAction, 
  actionIcon, 
  showCreateButton, 
  onCreateClick,
  createButtonText,
  ...rest 
}) => {
  // Filter out props that shouldn't be passed to DOM elements
  const boxProps = { ...rest };
  // Remove any non-standard props that might cause warnings
  delete boxProps.showCreateButton;
  delete boxProps.onCreateClick;
  delete boxProps.createButtonText;
  
  // Determine which button props to use
  const buttonLabel = createButtonText || actionLabel;
  const buttonAction = onCreateClick || onAction;
  
  // Show button if:
  // 1. showCreateButton is explicitly true, OR
  // 2. showCreateButton is not provided (undefined) and we have button props (backward compatibility)
  const shouldShowButton = 
    showCreateButton === true || 
    (showCreateButton === undefined && buttonLabel && buttonAction);
  
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
      {shouldShowButton && buttonLabel && buttonAction && (
        <Button variant="contained" startIcon={actionIcon || <Add />} onClick={buttonAction}>
          {buttonLabel}
        </Button>
      )}
    </Box>
  );
};

export default PageHeader;

