import React from "react";
import {
  FormControlLabel,
  Switch as MuiSwitch,
  FormGroup,
  FormLabel,
  FormHelperText,
} from "@mui/material";

const Switch = React.forwardRef(
  (
    {
      label,
      checked,
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
    if (label) {
      return (
        <FormControlLabel
          ref={ref}
          control={
            <MuiSwitch
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
      <MuiSwitch
        ref={ref}
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

Switch.displayName = "Switch";

export default Switch;
