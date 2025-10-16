import React from "react";
import { TextField } from "@mui/material";

const TextArea = React.forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      variant = "outlined",
      size = "medium",
      fullWidth = true,
      required = false,
      disabled = false,
      error = false,
      helperText,
      rows = 4,
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
        value={value}
        onChange={onChange}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        required={required}
        disabled={disabled}
        error={error}
        helperText={helperText}
        multiline
        rows={rows}
        maxRows={maxRows}
        minRows={minRows}
        sx={sx}
        {...props}
      />
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;
