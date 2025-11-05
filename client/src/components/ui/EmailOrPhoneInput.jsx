import React from 'react';
import TextField from '@mui/material/TextField';

/**
 * CombinedContactInput
 * Single MUI TextField that accepts a phone number or an email.
 * It auto-detects the type and validates accordingly.
 *
 * Props:
 *  - label?: string
 *  - placeholder?: string
 *  - value?: string
 *  - onChange?: (value: string, meta: { kind: "email" | "phone" | "unknown", valid: boolean }) => void
 *  - required?: boolean
 *  - fullWidth?: boolean
 */
export default function CombinedContactInput({
  label = 'Email or phone',
  placeholder = 'Enter email or phone number',
  value: controlledValue,
  onChange,
  required = false,
  fullWidth = true,
  sx,
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState('');
  const value = controlledValue ?? uncontrolledValue;

  const kind = detectKind(value);
  const valid = validate(value, kind, { required });

  const handleChange = (e) => {
    const v = e.target.value;
    if (controlledValue === undefined) setUncontrolledValue(v);
    const detectedKind = detectKind(v);
    onChange?.(v, { kind: detectedKind, valid: validate(v, detectedKind, { required }) });
  };

  // Notify parent of validation status changes (for initial mount and when validation changes)
  React.useEffect(() => {
    onChange?.(value, { kind, valid });
  }, [kind, valid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      required={required}
      fullWidth={fullWidth}
      placeholder={placeholder}
      variant="outlined"
      InputLabelProps={{ shrink: true }}
      error={false}
      helperText=""
      sx={sx}
      inputProps={{
        inputMode: kind === 'phone' ? 'tel' : 'email',
        autoComplete: kind === 'phone' ? 'tel' : 'email',
      }}
    />
  );
}

function detectKind(input) {
  const v = (input || '').trim();
  if (!v) return 'unknown';
  return v.includes('@') ? 'email' : 'phone';
}

function validate(input, kind, { required }) {
  const v = (input || '').trim();
  if (!v) return required ? false : true;
  if (kind === 'email') return isEmail(v);
  if (kind === 'phone') return isPhone(v);
  return false;
}

// Simple email regex: local@domain.tld with at least a 2-letter TLD
function isEmail(v) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(v);
}

// Simple phone validation: allow leading +; 10–15 digits after stripping punctuation
function isPhone(v) {
  const digits = v.replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
