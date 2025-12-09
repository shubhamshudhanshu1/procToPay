import React from 'react';
import { Chip } from '@mui/material';

/**
 * Reusable StatusChip component that maps string values to colors
 * 
 * @param {string} value - The status/tag value (e.g., "active", "draft", "VOLUME_BASED")
 * @param {string} size - Chip size: "small" | "medium" | "large"
 * @param {object} colorMap - Optional custom color mapping
 * @param {object} sx - Additional styles
 */
const StatusChip = ({ 
  value, 
  size = 'small', 
  colorMap = null,
  sx = {},
  ...props 
}) => {
  // Default color mapping for common statuses/types
  const defaultColorMap = {
    // Status colors
    'active': { color: 'success', bgColor: '#E8F5E9' },
    'draft': { color: 'warning', bgColor: '#FFF8E1' },
    'archived': { color: 'default', bgColor: '#F5F5F5' },
    
    // Template type colors (gray pills as per design)
    'VOLUME_BASED': { color: 'default', bgColor: '#F5F5F5' },
    'SEASONAL': { color: 'default', bgColor: '#F5F5F5' },
    'LAUNCH_SUPPORT': { color: 'default', bgColor: '#F5F5F5' },
    'CLEARANCE': { color: 'default', bgColor: '#F5F5F5' },
    
    // Parameter type colors (if needed)
    'text': { color: 'info', bgColor: '#E0F7FA' },
    'number': { color: 'primary', bgColor: '#E3F2FD' },
    'date': { color: 'secondary', bgColor: '#F3E5F5' },
    'boolean': { color: 'success', bgColor: '#E8F5E9' },
    'currency': { color: 'warning', bgColor: '#FFF8E1' },
    'percentage': { color: 'error', bgColor: '#FFEBEE' },
  };

  const mapping = colorMap || defaultColorMap;
  const config = mapping[value] || { color: 'default', bgColor: '#F5F5F5' };

  return (
    <Chip
      label={value}
      size={size}
      color={config.color}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color === 'default' ? '#6C757D' : undefined,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        height: size === 'small' ? '22px' : '32px',
        fontWeight: 500,
        ...sx,
      }}
      {...props}
    />
  );
};

export default StatusChip;

