import React from "react";
import { Alert as MuiAlert, AlertTitle } from "@mui/material";

const Alert = React.forwardRef(
  (
    {
      children,
      severity = "info",
      variant = "standard",
      title,
      action,
      onClose,
      closeText = "Close",
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiAlert
        ref={ref}
        severity={severity}
        variant={variant}
        action={action}
        onClose={onClose}
        closeText={closeText}
        sx={sx}
        {...props}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {children}
      </MuiAlert>
    );
  }
);

Alert.displayName = "Alert";

export default Alert;
