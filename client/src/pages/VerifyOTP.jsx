import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { VpnKey as KeyIcon } from '@mui/icons-material';
import { z } from 'zod';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { Box, Paper, Typography, Input, Button, Alert } from '../components/ui';

const otpSchema = z.object({
  otp: z.string().min(4, 'OTP must be at least 4 digits').max(8, 'OTP must be at most 8 digits'),
});

const VerifyOTP = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  // Get email from location state or redirect to login
  const email = location.state?.email;

  if (!email) {
    navigate('/login');
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    try {
      // Verify OTP - this will create a session on the backend
      await authService.verifyOTP(email, data.otp);

      // Fetch current user to get user data
      const user = await authService.getCurrentUser();

      // Update auth store (session is managed via cookies)
      login(user, null); // No token needed for session-based auth

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      await authService.requestOTP(email);
      setError('');
      // Could show success message here
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        {/* Logo/Icon */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              backgroundColor: '#6C757D',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              ₹
            </Typography>
          </Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: '#343A40', mb: 1 }}
          >
            Verify OTP
          </Typography>
          <Typography variant="body2" sx={{ color: '#6C757D' }}>
            Enter the code sent to {email}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="OTP Code"
            type="text"
            placeholder="Enter 6-digit code"
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
            Verify OTP
          </Button>
        </form>

        <Button
          fullWidth
          variant="text"
          size="medium"
          onClick={handleResendOTP}
          disabled={loading}
          sx={{
            color: '#6C757D',
          }}
        >
          Resend OTP
        </Button>

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
      </Paper>
    </Box>
  );
};

export default VerifyOTP;
