import React from 'react';
import { TextField, Grid, Typography } from '@mui/material';

/**
 * DynamicForm Component
 * A reusable form component that generates form fields based on configuration
 *
 * @param {Array} fields - Array of field configuration objects
 * @param {Object} values - Current form values object
 * @param {Function} onChange - Callback function when field value changes (fieldName, value) => void
 * @param {Number} columnsPerRow - Number of columns per row (default: 2)
 * @param {Object} sx - Additional styles
 */
const DynamicForm = ({ fields = [], values = {}, onChange, columnsPerRow = 2, sx = {} }) => {
  const handleFieldChange = (fieldName, value) => {
    if (onChange) {
      onChange(fieldName, value);
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      type = 'text',
      required = false,
      placeholder,
      helperText,
      description,
      options, // For select/boolean fields
      min,
      max,
      ...fieldProps
    } = field;

    const value = values[name] || '';
    const fieldHelperText = helperText || description;

    // Calculate grid size based on columnsPerRow
    const gridSize = 12 / columnsPerRow;

    // Grid size prop to ensure consistent columns per row across all breakpoints
    const gridSizeProp = {
      size: {
        xs: gridSize,
        sm: gridSize,
        md: gridSize,
        lg: gridSize,
      },
    };

    switch (type) {
      case 'boolean':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              select
              label={label || name}
              value={value === true || value === 'true' ? 'true' : 'false'}
              onChange={(e) => handleFieldChange(name, e.target.value === 'true')}
              placeholder={placeholder || `Enter ${name}`}
              required={required}
              fullWidth
              SelectProps={{ native: true }}
              helperText={fieldHelperText}
              {...fieldProps}
            >
              {options ? (
                options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </>
              )}
            </TextField>
          </Grid>
        );

      case 'currency':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              type="number"
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || `Enter ${name}`}
              required={required}
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
              }}
              inputProps={{ min: min || 0 }}
              helperText={fieldHelperText}
              {...fieldProps}
            />
          </Grid>
        );

      case 'percentage':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              type="number"
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || `Enter ${name}`}
              required={required}
              fullWidth
              inputProps={{ min: min || 0, max: max || 100 }}
              InputProps={{
                endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>,
              }}
              helperText={fieldHelperText}
              {...fieldProps}
            />
          </Grid>
        );

      case 'select':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              select
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || `Select ${name}`}
              required={required}
              fullWidth
              SelectProps={{ native: true }}
              helperText={fieldHelperText}
              {...fieldProps}
            >
              <option value="">Select {label || name}</option>
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </TextField>
          </Grid>
        );

      case 'date':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              type="date"
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || 'dd/mm/yyyy'}
              required={required}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText={fieldHelperText}
              {...fieldProps}
            />
          </Grid>
        );

      case 'number':
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              type="number"
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || `Enter ${name}`}
              required={required}
              fullWidth
              inputProps={{ min: min || 0, max: max }}
              helperText={fieldHelperText}
              {...fieldProps}
            />
          </Grid>
        );

      default:
        return (
          <Grid item {...gridSizeProp} key={name}>
            <TextField
              type={type}
              label={label || name}
              value={value}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder || `Enter ${name}`}
              required={required}
              fullWidth
              helperText={fieldHelperText}
              {...fieldProps}
            />
          </Grid>
        );
    }
  };

  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2} sx={sx}>
      {fields.map((field) => renderField(field))}
    </Grid>
  );
};

export default DynamicForm;
