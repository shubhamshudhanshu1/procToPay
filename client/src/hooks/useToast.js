import { useState, useCallback } from 'react';

/**
 * Simple toast notification hook
 * Returns { toast, showToast } where:
 * - toast: { open, message, severity } - current toast state
 * - showToast: (message, severity) => void - function to show toast
 */
export const useToast = () => {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success' | 'error' | 'warning' | 'info'
  });

  const showToast = useCallback((message, severity = 'info') => {
    setToast({
      open: true,
      message,
      severity,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};

