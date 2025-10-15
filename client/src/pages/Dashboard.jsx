import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";
import { AccountCircle, Logout } from "@mui/icons-material";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { profileSchema } from "../schemas/authSchemas";

const Dashboard = () => {
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
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: authService.getProfile,
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data) => {
      updateUser(data.user);
      setEditMode(false);
      queryClient.invalidateQueries(["profile"]);
    },
  });

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const handleEdit = () => {
    setEditMode(true);
    reset({
      name: profileData?.user?.name || "",
      email: profileData?.user?.email || "",
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
              {user?.name?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
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
            Welcome, {profileData?.user?.name || user?.name}!
          </Typography>

          {updateProfileMutation.error && (
            <Alert severity="error" className="mb-4">
              {updateProfileMutation.error.response?.data?.error ||
                "An error occurred"}
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
                label="Name"
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                className="mb-4"
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                {...register("email")}
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
                  {updateProfileMutation.isPending ? "Saving..." : "Save"}
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
                  <strong>Name:</strong> {profileData?.user?.name || "Not set"}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {profileData?.user?.email}
                </Typography>
                <Typography variant="body1">
                  <strong>Member since:</strong>{" "}
                  {new Date(profileData?.user?.createdAt).toLocaleDateString()}
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
