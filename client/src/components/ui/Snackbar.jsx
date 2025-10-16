import React from "react";
import { Snackbar as MuiSnackbar, Alert } from "@mui/material";

const Snackbar = React.forwardRef(
  (
    {
      open,
      onClose,
      message,
      severity = "info",
      autoHideDuration = 6000,
      anchorOrigin = { vertical: "bottom", horizontal: "left" },
      action,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiSnackbar
        ref={ref}
        open={open}
        onClose={onClose}
        autoHideDuration={autoHideDuration}
        anchorOrigin={anchorOrigin}
        action={action}
        sx={sx}
        {...props}
      >
        <Alert onClose={onClose} severity={severity} sx={{ width: "100%" }}>
          {message}
        </Alert>
      </MuiSnackbar>
    );
  }
);

Snackbar.displayName = "Snackbar";

export default Snackbar;
