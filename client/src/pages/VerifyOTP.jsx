import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { VpnKey as KeyIcon, Email as EmailIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { z } from 'zod';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { AuthLayout, AuthHeader, AuthAlert } from '../components/auth';
import { Input, Button, Typography, Box } from '../components/ui';

const otpSchema = z.object({
  otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must be at most 8 digits'),
});

const VerifyOTP = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
  const [isTimerActive, setIsTimerActive] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const timerRef = useRef(null);

  // Get contacts from location state
  // For login: { email: string, type: 'email' | 'phone' }
  // For registration: { email?: string, phoneNumber?: string, verifyBoth?: boolean }
  const contacts = location.state;

  // Early return if no contacts
  if (!contacts || (!contacts.email && !contacts.phoneNumber)) {
    navigate('/login');
    return null;
  }

  // Determine what to verify
  const isRegistration = contacts?.verifyBoth || (contacts?.email && contacts?.phoneNumber);
  const contactsToVerify = isRegistration
    ? [
        contacts?.email && { value: contacts.email, type: 'email', verified: false },
        contacts?.phoneNumber && { value: contacts.phoneNumber, type: 'phone', verified: false },
      ].filter(Boolean)
    : [
        {
          value: contacts?.email || contacts?.phoneNumber,
          type: contacts?.type || 'email',
          verified: false,
        },
      ].filter((c) => c.value);

  if (contactsToVerify.length === 0) {
    navigate('/login');
    return null;
  }

  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [verifiedContacts, setVerifiedContacts] = useState([]);
  const currentContact = contactsToVerify[currentContactIndex];

  // Request OTP for current contact on mount or when contact changes
  useEffect(() => {
    if (currentContact && !verifiedContacts.includes(currentContact.type)) {
      // Request OTP for the current contact
      authService.requestOTP(currentContact.value).catch(() => {
        // Error handled silently - user can resend
      });
    }
  }, [currentContactIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize timer
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isTimerActive]);

  // Reset timer when contact changes
  useEffect(() => {
    setTimeLeft(60);
    setIsTimerActive(true);
  }, [currentContactIndex]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Verify OTP - currently backend only supports email
      // For phone, we'll use the same endpoint but the backend needs to support it
      const contactValue = currentContact.value;
      await authService.verifyOTP(contactValue, data.otp);

      // Mark current contact as verified
      const updatedVerified = [...verifiedContacts, currentContact.type];
      setVerifiedContacts(updatedVerified);

      // If registration and more contacts to verify, move to next
      if (isRegistration && currentContactIndex < contactsToVerify.length - 1) {
        setSuccess(`${currentContact.type === 'email' ? 'Email' : 'Phone'} verified successfully!`);
        reset();
        setTimeLeft(60);
        setIsTimerActive(true);
        setCurrentContactIndex(currentContactIndex + 1);
        setLoading(false);
        return;
      }

      // All verified or login - complete authentication
      if (isRegistration) {
        // For registration, fetch user after all verifications
        const user = await authService.getCurrentUser();
        login(user, null);
        navigate('/dashboard');
      } else {
        // For login, fetch user and complete
        const user = await authService.getCurrentUser();
        login(user, null);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (isTimerActive) return; // Don't allow resend if timer is active

    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      await authService.requestOTP(currentContact.value);
      setSuccess('OTP sent successfully!');
      setTimeLeft(60);
      setIsTimerActive(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContactDisplay = (contact) => {
    if (contact.type === 'email') {
      return contact.value;
    }
    return contact.value;
  };

  const getContactTypeLabel = (type) => {
    return type === 'email' ? 'Email' : 'Phone Number';
  };

  return (
    <AuthLayout>
      <AuthHeader
        title={isRegistration ? 'Verify Contact' : 'Verify OTP'}
        subtitle={
          isRegistration && contactsToVerify.length > 1
            ? `Step ${currentContactIndex + 1} of ${contactsToVerify.length}`
            : undefined
        }
      />

      <AuthAlert error={error} success={success} />

      {/* Contact Info Display */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: '#F8F9FA',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {currentContact.type === 'email' ? (
          <EmailIcon sx={{ color: '#6C757D' }} />
        ) : (
          <PhoneIcon sx={{ color: '#6C757D' }} />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ color: '#6C757D', mb: 0.5 }}>
            {getContactTypeLabel(currentContact.type)}:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#343A40' }}>
            {getContactDisplay(currentContact)}
          </Typography>
        </Box>
      </Box>

      {/* Progress indicator for multiple verifications */}
      {isRegistration && contactsToVerify.length > 1 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
          {contactsToVerify.map((contact, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  index < currentContactIndex || verifiedContacts.includes(contact.type)
                    ? '#28A745'
                    : index === currentContactIndex
                      ? '#6C757D'
                      : '#DEE2E6',
              }}
            />
          ))}
        </Box>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={`Enter OTP sent to your ${currentContact.type === 'email' ? 'email' : 'phone'}`}
          type="text"
          placeholder="Enter OTP code"
          {...register('otp')}
          error={!!errors.otp}
          helperText={errors.otp?.message}
          sx={{ mb: 2 }}
          startAdornment={<KeyIcon sx={{ mr: 1, color: '#ADB5BD' }} />}
          autoComplete="off"
          autoFocus
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          loading={loading}
          sx={{
            py: 1.5,
            backgroundColor: '#6C757D',
            '&:hover': {
              backgroundColor: '#5A6268',
            },
            mb: 2,
          }}
        >
          {isRegistration && currentContactIndex < contactsToVerify.length - 1
            ? 'Verify & Continue'
            : 'Verify OTP'}
        </Button>
      </form>

      {/* Resend OTP */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
        <Button
          variant="text"
          size="medium"
          onClick={handleResendOTP}
          disabled={isTimerActive || resendLoading || loading}
          loading={resendLoading}
          sx={{
            color: '#6C757D',
          }}
        >
          Resend OTP
        </Button>
        {isTimerActive && (
          <Typography variant="body2" sx={{ color: '#6C757D' }}>
            ({formatTime(timeLeft)})
          </Typography>
        )}
      </Box>

      {/* Back to Login */}
      {!isRegistration && (
        <Button
          fullWidth
          variant="text"
          size="small"
          onClick={() => navigate('/login')}
          sx={{
            mt: 1,
            color: '#6C757D',
          }}
        >
          Back to Login
        </Button>
      )}
    </AuthLayout>
  );
};

export default VerifyOTP;
