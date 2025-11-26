import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { profileSchema } from '../schemas/authSchemas';
import MainLayout from '../components/layout/MainLayout';

const Dashboard = () => {
  const [editMode, setEditMode] = useState(false);
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.getCurrentUser, // Use /api/me instead of /users/profile
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data) => {
      // /me PUT returns user object directly (not wrapped in 'user')
      updateUser(data.user || data);
      setEditMode(false);
      queryClient.invalidateQueries(['profile']);
    },
  });

  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const handleEdit = () => {
    setEditMode(true);
    reset({
      firstName: profileData?.firstName || user?.firstName || '',
      lastName: profileData?.lastName || user?.lastName || '',
      email: profileData?.email || user?.email || '',
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    reset();
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Typography>Loading...</Typography>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor: '#FFFFFF',
            borderRadius: 1,
            border: '1px solid #E0E0E0',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              color: '#343A40',
              mb: 3,
              fontSize: '1.5rem',
            }}
          >
            Welcome, {profileData?.firstName || user?.firstName || user?.email}!
          </Typography>

          {updateProfileMutation.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {updateProfileMutation.error.response?.data?.error || 'An error occurred'}
            </Alert>
          )}

          {updateProfileMutation.isSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Profile updated successfully!
            </Alert>
          )}

          {editMode ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />

                <TextField
                  fullWidth
                  label="Last Name"
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateProfileMutation.isPending}
                  sx={{
                    backgroundColor: '#343A40',
                    '&:hover': {
                      backgroundColor: '#2C2C2C',
                    },
                  }}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                  sx={{
                    borderColor: '#6C757D',
                    color: '#6C757D',
                    '&:hover': {
                      borderColor: '#5A6268',
                      backgroundColor: '#F8F9FA',
                    },
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          ) : (
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#343A40',
                  mb: 2,
                }}
              >
                Profile Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                <Typography variant="body1" sx={{ color: '#343A40' }}>
                  <strong>First Name:</strong>{' '}
                  {profileData?.firstName || user?.firstName || 'Not set'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#343A40' }}>
                  <strong>Last Name:</strong> {profileData?.lastName || user?.lastName || 'Not set'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#343A40' }}>
                  <strong>Email:</strong> {profileData?.email || user?.email}
                </Typography>
                <Typography variant="body1" sx={{ color: '#343A40' }}>
                  <strong>Member since:</strong>{' '}
                  {profileData?.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString()
                    : user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/A'}
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={handleEdit}
                sx={{
                  backgroundColor: '#343A40',
                  '&:hover': {
                    backgroundColor: '#2C2C2C',
                  },
                }}
              >
                Edit Profile
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default Dashboard;
