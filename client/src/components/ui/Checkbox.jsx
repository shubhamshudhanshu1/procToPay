import React from "react";
import {
  FormControlLabel,
  Checkbox as MuiCheckbox,
  FormGroup,
  FormLabel,
  FormHelperText,
} from "@mui/material";

const Checkbox = React.forwardRef(
  (
    {
      label,
      checked,
      onChange,
      disabled = false,
      color = "primary",
      size = "medium",
      indeterminate = false,
      helperText,
      sx,
      ...props
    },
    ref
  ) => {
    if (label) {
      return (
        <FormControlLabel
          ref={ref}
          control={
            <MuiCheckbox
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              color={color}
              size={size}
              indeterminate={indeterminate}
              {...props}
            />
          }
          label={label}
          sx={sx}
        />
      );
    }

    return (
      <MuiCheckbox
        ref={ref}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        color={color}
        size={size}
        indeterminate={indeterminate}
        sx={sx}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

// Checkbox Group Component
export const CheckboxGroup = React.forwardRef(
  (
    {
      label,
      options = [],
      value = [],
      onChange,
      disabled = false,
      color = "primary",
      size = "medium",
      helperText,
      sx,
      ...props
    },
    ref
  ) => {
    const handleChange = (optionValue) => {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange?.(newValue);
    };

    return (
      <FormGroup ref={ref} sx={sx} {...props}>
        {label && <FormLabel component="legend">{label}</FormLabel>}
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={
              <MuiCheckbox
                checked={value.includes(option.value)}
                onChange={() => handleChange(option.value)}
                disabled={disabled}
                color={color}
                size={size}
              />
            }
            label={option.label}
          />
        ))}
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormGroup>
    );
  }
);

CheckboxGroup.displayName = "CheckboxGroup";

export default Checkbox;
