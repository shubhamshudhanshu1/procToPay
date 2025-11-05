import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { loginSchema } from '../schemas/authSchemas';
import { useAuthStore } from '../store/authStore';
import { AuthLayout, AuthHeader, AuthAlert } from '../components/auth';
import { EmailOrPhoneInput, Button, Typography, Link } from '../components/ui';
import { Link as RouterLink } from 'react-router-dom';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [inputType, setInputType] = useState(null); // Track detected type (email/phone)
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
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authService.requestOTP(data.email);
      const message =
        inputType === 'phone'
          ? 'OTP sent to your phone. Please check your messages.'
          : 'OTP sent to your email. Please check your inbox.';
      setSuccess(message);
      setError('');
      navigate('/verify-otp', { state: { email: data.email, type: inputType } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
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
          name="email"
          control={control}
          render={({ field }) => (
            <EmailOrPhoneInput
              label="Email or Phone"
              placeholder="Enter your email or phone number"
              value={field.value || ''}
              onChange={(value, type) => {
                field.onChange(value);
                setInputType(type);
              }}
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
          Send OTP
        </Button>
      </form>

      <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        Don't have an account?{' '}
        <Link component={RouterLink} to="/register" sx={{ fontWeight: 600 }}>
          Register
        </Link>
      </Typography>
    </AuthLayout>
  );
};

export default Login;
