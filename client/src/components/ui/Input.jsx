import React from "react";
import { TextField } from "@mui/material";

const Input = React.forwardRef(
  (
    {
      label,
      placeholder,
      type = "text",
      variant = "outlined",
      size = "medium",
      fullWidth = true,
      required = false,
      disabled = false,
      error = false,
      helperText,
      startAdornment,
      endAdornment,
      multiline = false,
      rows,
      maxRows,
      minRows,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <TextField
        ref={ref}
        label={label}
        placeholder={placeholder}
        type={type}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        required={required}
        disabled={disabled}
        error={error}
        helperText={helperText}
        InputProps={{
          startAdornment,
          endAdornment,
          ...props.InputProps,
        }}
        multiline={multiline}
        rows={rows}
        maxRows={maxRows}
        minRows={minRows}
        sx={sx}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
