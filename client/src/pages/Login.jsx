import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { loginSchema, registerSchema } from "../schemas/authSchemas";

const Login = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(tab === 0 ? loginSchema : registerSchema),
  });

  const onSubmit = async (data) => {
    setError("");
    setLoading(true);

    try {
      if (tab === 0) {
        // Login
        const response = await authService.login(data);
        login(response.user, response.token);
        navigate("/dashboard");
      } else {
        // Register
        const { confirmPassword, ...registerData } = data;
        const response = await authService.register(registerData);
        login(response.user, response.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError("");
    reset();
  };

  return (
    <Container maxWidth="sm" className="py-8">
      <Paper elevation={3} className="p-6">
        <Typography variant="h4" component="h1" className="text-center mb-6">
          Proc to Pay
        </Typography>

        <Box className="mb-6">
          <Tabs value={tab} onChange={handleTabChange} centered>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {tab === 1 && (
            <TextField
              fullWidth
              label="Name"
              {...register("name")}
              error={!!errors.name}
              helperText={errors.name?.message}
              className="mb-4"
            />
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
            className="mb-4"
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
            className="mb-4"
          />

          {tab === 1 && (
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              className="mb-4"
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            className="py-2"
          >
            {loading ? "Loading..." : tab === 0 ? "Login" : "Register"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
