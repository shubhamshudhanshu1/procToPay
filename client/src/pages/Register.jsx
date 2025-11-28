import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authService } from '../services/authService';
import { registerSchema } from '../schemas/authSchemas';
import { useAuthStore } from '../store/authStore';
import { AuthLayout, AuthHeader, AuthAlert } from '../components/auth';
import { Input, Button, Typography, Link } from '../components/ui';

const Register = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await authService.register(data);

      // Both email and phone are required, so we need to verify both
      const verifyBoth = true;

      // Prepare navigation state with userId from registration response
      const navigateState = {
        email: data.email,
        phoneNumber: data.phoneNumber,
        userId: result.userId,
        verifyBoth,
      };

      const message = 'Registration successful! Please verify both your email and phone number.';

      setSuccess(message);
      setError('');
      navigate('/verify-otp', { state: navigateState });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader />

      <AuthAlert error={error} success={success} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="firstName"
          control={control}
          render={({ field }) => (
            <Input
              label="First Name"
              placeholder="Enter your first name"
              value={field.value || ''}
              onChange={field.onChange}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              required
              sx={{ mb: 2 }}
            />
          )}
        />

        <Controller
          name="lastName"
          control={control}
          render={({ field }) => (
            <Input
              label="Last Name"
              placeholder="Enter your last name"
              value={field.value || ''}
              onChange={field.onChange}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              required
              sx={{ mb: 2 }}
            />
          )}
        />

        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              type="tel"
              value={field.value || ''}
              onChange={field.onChange}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
              required
              sx={{ mb: 2 }}
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              label="Email Address"
              placeholder="Enter your email address"
              type="email"
              value={field.value || ''}
              onChange={field.onChange}
              error={!!errors.email}
              helperText={errors.email?.message}
              required
              sx={{ mb: 2 }}
            />
          )}
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
          }}
        >
          Register
        </Button>
      </form>

      <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
          Login
        </Link>
      </Typography>
    </AuthLayout>
  );
};

export default Register;
