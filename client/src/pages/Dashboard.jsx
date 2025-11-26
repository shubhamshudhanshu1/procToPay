import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import { AccountCircle, Logout } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { profileSchema } from '../schemas/authSchemas';

const Dashboard = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const { user, logout, updateUser } = useAuthStore();
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

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    // Clear all queries to prevent stale data
    queryClient.clear();
    // Navigate to login page
    navigate('/login');
  };

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
      <Container maxWidth="md" className="py-8">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Box className="min-h-screen bg-gray-50">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" className="flex-grow">
            Proc to Pay Dashboard
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleLogout}>
              <Logout className="mr-2" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" className="py-8">
        <Paper elevation={3} className="p-6">
          <Typography variant="h4" component="h1" className="mb-6">
            Welcome, {profileData?.firstName || user?.firstName || user?.email}!
          </Typography>

          {updateProfileMutation.error && (
            <Alert severity="error" className="mb-4">
              {updateProfileMutation.error.response?.data?.error || 'An error occurred'}
            </Alert>
          )}

          {updateProfileMutation.isSuccess && (
            <Alert severity="success" className="mb-4">
              Profile updated successfully!
            </Alert>
          )}

          {editMode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TextField
                fullWidth
                label="First Name"
                {...register('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                className="mb-4"
              />

              <TextField
                fullWidth
                label="Last Name"
                {...register('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                className="mb-4"
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                className="mb-4"
              />

              <Box className="flex gap-4">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          ) : (
            <Box className="space-y-4">
              <Box>
                <Typography variant="h6">Profile Information</Typography>
                <Typography variant="body1">
                  <strong>First Name:</strong>{' '}
                  {profileData?.firstName || user?.firstName || 'Not set'}
                </Typography>
                <Typography variant="body1">
                  <strong>Last Name:</strong> {profileData?.lastName || user?.lastName || 'Not set'}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {profileData?.email || user?.email}
                </Typography>
                <Typography variant="body1">
                  <strong>Member since:</strong>{' '}
                  {profileData?.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString()
                    : user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/A'}
                </Typography>
              </Box>

              <Button variant="contained" onClick={handleEdit}>
                Edit Profile
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;
