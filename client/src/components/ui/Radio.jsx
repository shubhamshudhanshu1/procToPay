import React from "react";
import {
  FormControl,
  FormLabel,
  RadioGroup as MuiRadioGroup,
  FormControlLabel,
  Radio as MuiRadio,
  FormHelperText,
} from "@mui/material";

const Radio = React.forwardRef(
  (
    {
      label,
      value,
      checked,
      onChange,
      disabled = false,
      color = "primary",
      size = "medium",
      sx,
      ...props
    },
    ref
  ) => {
    if (label) {
      return (
        <FormControlLabel
          ref={ref}
          value={value}
          control={
            <MuiRadio
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              color={color}
              size={size}
              {...props}
            />
          }
          label={label}
          sx={sx}
        />
      );
    }

    return (
      <MuiRadio
        ref={ref}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        color={color}
        size={size}
        sx={sx}
        {...props}
      />
    );
  }
);

Radio.displayName = "Radio";

// Radio Group Component
export const RadioGroup = React.forwardRef(
  (
    {
      label,
      options = [],
      value,
      onChange,
      disabled = false,
      color = "primary",
      size = "medium",
      helperText,
      row = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <FormControl ref={ref} sx={sx} {...props}>
        {label && <FormLabel component="legend">{label}</FormLabel>}
        <MuiRadioGroup value={value} onChange={onChange} row={row}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={
                <MuiRadio disabled={disabled} color={color} size={size} />
              }
              label={option.label}
            />
          ))}
        </MuiRadioGroup>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

export default Radio;
