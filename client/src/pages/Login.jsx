import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Email as EmailIcon } from '@mui/icons-material';
import { authService } from '../services/authService';
import { loginSchema } from '../schemas/authSchemas';
import { AuthLayout, AuthHeader, AuthAlert } from '../components/auth';
import { Input, Button, Typography } from '../components/ui';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const {
    register,
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
      setSuccess('OTP sent to your email. Please check your inbox.');
      setError('');
      navigate('/verify-otp', { state: { email: data.email } });
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
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          sx={{ mb: 2 }}
          startAdornment={<EmailIcon sx={{ mr: 1, color: '#ADB5BD' }} />}
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

      <Typography variant="body2" sx={{ color: '#6C757D', mt: 2, textAlign: 'left' }}>
        Demo credentials: admin@mail.com, OTP: 1234
      </Typography>
    </AuthLayout>
  );
};

export default Login;
