import { VpnKey as KeyIcon, Email as EmailIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { Input, Button, Typography, Box } from './ui';

const ContactOTPCard = ({
  contact,
  otpLength,
  isVerified,
  otpValue,
  onOTPChange,
  onVerify,
  onResend,
  isLoading,
  resendLoading,
  timer,
  error,
  register,
  errors,
}) => {
  const getContactTypeLabel = (type) => (type === 'email' ? 'Email' : 'Phone Number');

  return (
    <Box
      sx={{
        p: 2,
        border: isVerified ? '2px solid #28A745' : '1px solid #DEE2E6',
        borderRadius: 2,
        backgroundColor: isVerified ? '#F8FFF9' : '#FFFFFF',
      }}
    >
      {/* Contact Info */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {contact.type === 'email' ? (
          <EmailIcon sx={{ color: isVerified ? '#28A745' : '#6C757D' }} />
        ) : (
          <PhoneIcon sx={{ color: isVerified ? '#28A745' : '#6C757D' }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ color: '#6C757D', mb: 0.5 }}>
            {getContactTypeLabel(contact.type)}:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#343A40' }}>
            {contact.value}
          </Typography>
        </Box>
        {isVerified && (
          <Typography variant="body2" sx={{ color: '#28A745', fontWeight: 600 }}>
            ✓ Verified
          </Typography>
        )}
      </Box>

      {/* OTP Input */}
      {!isVerified ? (
        <>
          <Input
            label={`Enter OTP sent to your ${contact.type === 'email' ? 'email' : 'phone'}`}
            type="text"
            placeholder={`Enter ${otpLength}-digit OTP`}
            {...(register ? register('otp') : {})}
            value={otpValue}
            onChange={(e) => onOTPChange(contact.type, e.target.value)}
            error={register ? !!errors?.otp : !!error && error.includes(contact.type)}
            helperText={
              register
                ? errors?.otp?.message
                : error && error.includes(contact.type)
                  ? error
                  : undefined
            }
            sx={{ mb: 1.5 }}
            startAdornment={<KeyIcon sx={{ mr: 1, color: '#ADB5BD' }} />}
            autoComplete="off"
            disabled={isLoading}
            inputProps={{
              maxLength: otpLength,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
          />

          {/* Timer display below input field */}
          {timer?.isActive && (
            <Box sx={{ mb: 1.5, textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: '#6C757D' }}>
                Resend in: {timer.formatTime}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              type={register ? 'submit' : 'button'}
              variant="contained"
              size="medium"
              onClick={register ? undefined : () => onVerify(contact)}
              loading={isLoading}
              disabled={otpValue.length !== otpLength || isLoading}
              sx={{
                flex: 1,
                backgroundColor: '#6C757D',
                '&:hover': {
                  backgroundColor: '#5A6268',
                },
              }}
            >
              Verify {contact.type === 'email' ? 'Email' : 'Phone'}
            </Button>
            <Button
              variant="outlined"
              size="medium"
              onClick={() => onResend(contact)}
              disabled={timer?.isActive || resendLoading || isLoading}
              loading={resendLoading}
              sx={{
                borderColor: '#6C757D',
                color: '#6C757D',
              }}
            >
              Resend
            </Button>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            p: 1.5,
            backgroundColor: '#E8F5E9',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: '#28A745', fontWeight: 600 }}>
            ✓ {contact.type === 'email' ? 'Email' : 'Phone'} verified successfully
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContactOTPCard;
