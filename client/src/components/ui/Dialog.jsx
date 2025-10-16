import React from "react";
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const Dialog = React.forwardRef(
  (
    {
      children,
      open,
      onClose,
      title,
      content,
      actions,
      maxWidth = "sm",
      fullWidth = false,
      fullScreen = false,
      closeButton = true,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiDialog
        ref={ref}
        open={open}
        onClose={onClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        fullScreen={fullScreen}
        sx={sx}
        {...props}
      >
        {title && (
          <DialogTitle>
            {title}
            {closeButton && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>
        )}
        {content && (
          <DialogContent>
            {typeof content === "string" ? (
              <DialogContentText>{content}</DialogContentText>
            ) : (
              content
            )}
          </DialogContent>
        )}
        {children}
        {actions && <DialogActions>{actions}</DialogActions>}
      </MuiDialog>
    );
  }
);

Dialog.displayName = "Dialog";

export default Dialog;
