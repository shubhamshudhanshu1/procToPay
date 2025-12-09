import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

/**
 * Reusable Confirmation Dialog Component
 * 
 * @param {boolean} open - Whether dialog is open
 * @param {function} onClose - Callback when dialog is closed (without confirming)
 * @param {function} onConfirm - Callback when user confirms
 * @param {string} title - Dialog title (default: "Confirm Action")
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text (default: "Confirm")
 * @param {string} cancelText - Cancel button text (default: "Cancel")
 * @param {string} confirmColor - Confirm button color (default: "error")
 * @param {boolean} loading - Whether action is in progress
 */
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'error',
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    // Blur any focused elements before closing to prevent aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;

