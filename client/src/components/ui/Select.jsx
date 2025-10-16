import React from "react";
import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  FormHelperText,
} from "@mui/material";

const Select = React.forwardRef(
  (
    {
      label,
      options = [],
      value,
      onChange,
      error = false,
      helperText,
      disabled = false,
      required = false,
      fullWidth = true,
      size = "medium",
      variant = "outlined",
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <FormControl
        ref={ref}
        fullWidth={fullWidth}
        error={error}
        required={required}
        disabled={disabled}
        size={size}
        variant={variant}
        sx={sx}
      >
        <InputLabel>{label}</InputLabel>
        <MuiSelect value={value} onChange={onChange} label={label} {...props}>
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiSelect>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }
);

Select.displayName = "Select";

export default Select;
