import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Email as EmailIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { loginSchema } from '../schemas/authSchemas';
import { Box, Paper, Typography, Input, Button, Alert } from '../components/ui';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(data);
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
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
            Proc2Pay
          </Typography>
          <Typography variant="body2" sx={{ color: '#6C757D', mb: 0.5 }}>
            Procure to Pay ToT & Scheme Management System
          </Typography>
          <Typography variant="body2" sx={{ color: '#6C757D' }}>
            by NexProcureAI
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
      </Paper>
    </Box>
  );
};

export default Login;
