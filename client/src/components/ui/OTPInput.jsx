import React, { useState, useRef, useEffect } from 'react';
import { TextField, Box } from '@mui/material';

/**
 * OTPInput - A component for entering OTP codes with configurable number of digits
 * 
 * @param {Object} props
 * @param {number} props.length - Number of OTP digits (default: 6)
 * @param {string} props.value - Controlled value
 * @param {function} props.onChange - Callback when OTP changes: (value: string) => void
 * @param {function} props.onComplete - Callback when OTP is complete: (value: string) => void
 * @param {boolean} props.autoFocus - Auto focus first input (default: true)
 * @param {boolean} props.disabled - Disable all inputs
 * @param {boolean} props.error - Show error state
 * @param {string} props.helperText - Helper text to display
 * @param {Object} props.sx - Additional sx styles
 */
const OTPInput = React.forwardRef(
  (
    {
      length = 6,
      value: controlledValue,
      onChange,
      onComplete,
      autoFocus = true,
      disabled = false,
      error = false,
      helperText,
      sx,
      ...rest
    },
    ref
  ) => {
    const [values, setValues] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    // Use controlled value if provided
    useEffect(() => {
      if (controlledValue !== undefined) {
        const chars = controlledValue.split('').slice(0, length);
        const newValues = Array(length).fill('').map((_, i) => chars[i] || '');
        setValues(newValues);
      }
    }, [controlledValue, length]);

    // Auto focus first input
    useEffect(() => {
      if (autoFocus && inputRefs.current[0] && !disabled) {
        inputRefs.current[0].focus();
      }
    }, [autoFocus, disabled]);

    // Get current OTP value
    const getOTPValue = () => values.join('');

    // Update parent
    const notifyChange = (newValues) => {
      const otpValue = newValues.join('');
      onChange?.(otpValue);
      
      if (otpValue.length === length) {
        onComplete?.(otpValue);
      }
    };

    // Handle input change
    const handleChange = (index, newValue) => {
      // Only allow single digit
      const digit = newValue.slice(-1).replace(/[^0-9]/g, '');
      
      if (!digit && newValue.length === 0) {
        // Backspace - clear current and move to previous
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
        notifyChange(newValues);
        
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
        return;
      }

      if (digit) {
        const newValues = [...values];
        newValues[index] = digit;
        setValues(newValues);
        notifyChange(newValues);

        // Move to next input if available
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    };

    // Handle key down
    const handleKeyDown = (index, e) => {
      if (e.key === 'Backspace' && !values[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    // Handle paste
    const handlePaste = (index, e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
      
      if (pastedData) {
        const newValues = [...values];
        pastedData.split('').forEach((digit, i) => {
          if (index + i < length) {
            newValues[index + i] = digit;
          }
        });
        setValues(newValues);
        notifyChange(newValues);
        
        // Focus next empty input or last input
        const nextIndex = Math.min(index + pastedData.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
      }
    };

    return (
      <Box sx={{ ...sx }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} ref={ref}>
          {values.map((value, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              disabled={disabled}
              error={error}
              inputProps={{
                maxLength: 1,
                style: {
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  padding: '12px',
                },
              }}
              sx={{
                width: 56,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderWidth: value ? 2 : 1,
                    borderColor: error ? 'error.main' : value ? 'primary.main' : 'divider',
                  },
                },
              }}
              {...rest}
            />
          ))}
        </Box>
        {helperText && (
          <Box sx={{ width: '100%', textAlign: 'center', mt: 1, fontSize: '0.75rem', color: error ? 'error.main' : 'text.secondary' }}>
            {helperText}
          </Box>
        )}
      </Box>
    );
  }
);

OTPInput.displayName = 'OTPInput';

export default OTPInput;

