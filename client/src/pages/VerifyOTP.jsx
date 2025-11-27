import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { authService } from '../services/authService';
import { configService } from '../services/configService';
import { useAuthStore } from '../store/authStore';
import { AuthLayout, AuthHeader, AuthAlert } from '../components/auth';
import { Button, Box } from '../components/ui';
import ContactOTPCard from '../components/ContactOTPCard';

// Custom hook for timer
const useTimer = (initialSeconds = 60) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isActive]);

  const reset = (seconds = initialSeconds) => {
    setTimeLeft(seconds);
    setIsActive(true);
  };

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return { timeLeft, isActive, reset, formatTime: formatTime() };
};

const VerifyOTP = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpLength, setOtpLength] = useState(6);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  // Timer for single contact (login flow)
  const singleTimer = useTimer(60);

  // Timers state for registration contacts (stored as objects with timeLeft and isActive)
  const [contactTimers, setContactTimers] = useState({});

  // Fetch OTP length from config
  useEffect(() => {
    configService
      .getOTPConfig()
      .then((otpConfig) => {
        setOtpLength(otpConfig.length);
      })
      .catch((err) => {
        console.error('Failed to load OTP config:', err);
      });
  }, []);

  // Get contacts from location state
  const contacts = location.state;

  // Redirect back on reload (when location.state is lost)
  useEffect(() => {
    if (!contacts || (!contacts.email && !contacts.phoneNumber)) {
      navigate(-1);
    }
  }, [contacts, navigate]);

  // Return null if no contacts (handles reload case)
  if (!contacts || (!contacts.email && !contacts.phoneNumber)) {
    return null;
  }

  // Determine what to verify
  const isRegistration = contacts?.verifyBoth || (contacts?.email && contacts?.phoneNumber);
  const contactsToVerify = isRegistration
    ? [
        contacts?.email && { value: contacts.email, type: 'email' },
        contacts?.phoneNumber && { value: contacts.phoneNumber, type: 'phone' },
      ].filter(Boolean)
    : [
        {
          value: contacts?.email || contacts?.phoneNumber,
          type: contacts?.type || 'email',
        },
      ].filter((c) => c.value);

  if (contactsToVerify.length === 0) {
    navigate('/login');
    return null;
  }

  // Initialize timers for registration contacts
  useEffect(() => {
    if (isRegistration) {
      const newTimers = {};
      contactsToVerify.forEach((contact) => {
        if (!contactTimers[contact.type]) {
          newTimers[contact.type] = { timeLeft: 60, isActive: true };
        }
      });
      if (Object.keys(newTimers).length > 0) {
        setContactTimers((prev) => ({ ...prev, ...newTimers }));
      }
    }
  }, [isRegistration]);

  // Timer effect for registration contacts
  useEffect(() => {
    if (!isRegistration) return;

    const timerIntervals = {};
    contactsToVerify.forEach((contact) => {
      const timer = contactTimers[contact.type];
      if (timer && timer.isActive && timer.timeLeft > 0) {
        timerIntervals[contact.type] = setInterval(() => {
          setContactTimers((prev) => {
            const currentTimer = prev[contact.type];
            if (!currentTimer || !currentTimer.isActive) return prev;
            const newTimeLeft = currentTimer.timeLeft - 1;
            return {
              ...prev,
              [contact.type]: {
                timeLeft: newTimeLeft,
                isActive: newTimeLeft > 0,
              },
            };
          });
        }, 1000);
      }
    });

    return () => {
      Object.values(timerIntervals).forEach((interval) => clearInterval(interval));
    };
  }, [isRegistration, contactTimers, contactsToVerify]);

  // Track verification status and OTP values
  const [verifiedContacts, setVerifiedContacts] = useState([]);
  const [otpValues, setOtpValues] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // Form setup for login flow
  const otpSchema = z.object({
    otp: z
      .string()
      .length(otpLength, `OTP must be exactly ${otpLength} digits`)
      .regex(/^\d+$/, 'OTP must contain only numbers'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(otpSchema),
  });

  const singleOtpValue = watch('otp', '');

  // Handle OTP input change
  const handleOTPChange = (contactType, value) => {
    const numericValue = value.replace(/\D/g, '').slice(0, otpLength);
    if (isRegistration) {
      setOtpValues((prev) => ({
        ...prev,
        [contactType]: numericValue,
      }));
    } else {
      setValue('otp', numericValue, { shouldValidate: true });
    }
  };

  // Verify OTP for a specific contact
  const verifyContactOTP = async (contact) => {
    const otpValue = isRegistration ? otpValues[contact.type] : singleOtpValue;

    if (!otpValue || otpValue.length !== otpLength) {
      setError(
        `Please enter ${otpLength}-digit OTP for ${contact.type === 'email' ? 'email' : 'phone'}`
      );
      return false;
    }

    setError('');
    if (isRegistration) {
      setLoadingStates((prev) => ({ ...prev, [contact.type]: true }));
    } else {
      setLoading(true);
    }

    try {
      const response = await authService.verifyOTP(contact.value, otpValue);

      if (isRegistration) {
        setVerifiedContacts((prev) => [...prev, contact.type]);
        setOtpValues((prev) => {
          const updated = { ...prev };
          delete updated[contact.type];
          return updated;
        });
        setLoadingStates((prev) => ({ ...prev, [contact.type]: false }));
      } else {
        // Login flow - check if tenant selection is needed
        const { user: userData, sessionToken, requiresTenantSelection } = response;
        login(userData, sessionToken);
        
        if (requiresTenantSelection) {
          navigate('/tenant-selection');
        } else {
          // If tenant already selected, fetch full context and go to dashboard
          const user = await authService.getCurrentUser();
          useAuthStore.getState().updateUserContext(user);
          navigate('/dashboard');
        }
      }

      setSuccess(`${contact.type === 'email' ? 'Email' : 'Phone'} verified successfully!`);
      return true;
    } catch (err) {
      setError(
        err.response?.data?.error ||
          `Invalid or expired OTP for ${contact.type === 'email' ? 'email' : 'phone'}. Please try again.`
      );
      if (isRegistration) {
        setLoadingStates((prev) => ({ ...prev, [contact.type]: false }));
      } else {
        setLoading(false);
      }
      return false;
    }
  };

  // Handle form submit (for single contact verification - login flow)
  const onSubmit = async (data) => {
    await verifyContactOTP(contactsToVerify[0]);
  };

  // Check if all contacts are verified (for registration)
  useEffect(() => {
    if (isRegistration && verifiedContacts.length === contactsToVerify.length) {
      const completeAuth = async () => {
        try {
          // For registration, we need to call register/verify endpoint
          // This should return the same structure as login/verify
          // For now, redirect to tenant selection after registration
          navigate('/tenant-selection');
        } catch (err) {
          setError('Failed to complete authentication. Please try again.');
        }
      };
      completeAuth();
    }
  }, [verifiedContacts, contactsToVerify.length, isRegistration, navigate]);

  // Handle resend OTP
  const handleResendOTP = async (contact) => {
    const timer = isRegistration ? contactTimers[contact.type] : singleTimer;
    if (timer?.isActive) return;

    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      await authService.requestOTP(contact.value);
      setSuccess(`OTP sent successfully to ${contact.type === 'email' ? 'email' : 'phone'}!`);

      if (isRegistration) {
        // Reset timer for this contact
        setContactTimers((prev) => ({
          ...prev,
          [contact.type]: { timeLeft: 60, isActive: true },
        }));
      } else {
        singleTimer.reset();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Format timer for display
  const formatTimer = (timer) => {
    if (!timer) return '0:00';
    const mins = Math.floor(timer.timeLeft / 60);
    const secs = timer.timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AuthLayout>
      <AuthHeader
        title={isRegistration ? 'Verify Contacts' : 'Verify OTP'}
        subtitle={
          isRegistration && contactsToVerify.length > 1
            ? `Verify both email and phone number`
            : undefined
        }
        onBack={() => navigate(-1)}
      />

      <AuthAlert error={error} success={success} />

      {/* Stacked OTP inputs for registration */}
      {isRegistration && contactsToVerify.length > 1 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {contactsToVerify.map((contact) => {
            const timer = contactTimers[contact.type];
            return (
              <ContactOTPCard
                key={contact.type}
                contact={contact}
                otpLength={otpLength}
                isVerified={verifiedContacts.includes(contact.type)}
                otpValue={otpValues[contact.type] || ''}
                onOTPChange={handleOTPChange}
                onVerify={verifyContactOTP}
                onResend={handleResendOTP}
                isLoading={loadingStates[contact.type] || false}
                resendLoading={resendLoading}
                timer={
                  timer
                    ? {
                        isActive: timer.isActive,
                        formatTime: formatTimer(timer),
                      }
                    : null
                }
                error={error}
              />
            );
          })}
        </Box>
      ) : (
        /* Single OTP input for login */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ContactOTPCard
              contact={contactsToVerify[0]}
              otpLength={otpLength}
              isVerified={false}
              otpValue={singleOtpValue}
              onOTPChange={handleOTPChange}
              onVerify={verifyContactOTP}
              onResend={handleResendOTP}
              isLoading={loading}
              resendLoading={resendLoading}
              timer={singleTimer}
              error={error}
              register={register}
              errors={errors}
            />
          </form>
        </Box>
      )}
    </AuthLayout>
  );
};

export default VerifyOTP;
