import React from "react";
import { Button as MuiButton, CircularProgress } from "@mui/material";

const Button = React.forwardRef(
  (
    {
      variant = "contained",
      color = "primary",
      size = "medium",
      loading = false,
      disabled = false,
      startIcon,
      endIcon,
      fullWidth = false,
      children,
      sx,
      ...props
    },
    ref
  ) => {
    const buttonProps = {
      variant,
      color,
      size,
      disabled: disabled || loading,
      startIcon: loading ? (
        <CircularProgress size={16} color="inherit" />
      ) : (
        startIcon
      ),
      endIcon,
      fullWidth,
      sx,
      ...props,
    };

    return (
      <MuiButton ref={ref} {...buttonProps}>
        {children}
      </MuiButton>
    );
  }
);

Button.displayName = "Button";

export default Button;
