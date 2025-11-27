import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Business, AdminPanelSettings, Add } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { tenantService } from '../services/tenantService';
import AppHeader from '../components/layout/AppHeader';

export default function TenantSelection() {
  const navigate = useNavigate();
  const { user, selectTenant } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenantService.getUserTenants();
      setTenants(response.tenants || []);
      setIsSuperAdmin(response.isSuperAdmin || false);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err.response?.data?.error || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId) => {
    try {
      setSelecting(true);
      const response = await tenantService.selectTenant(tenantId);

      // Update auth store with tenant context and tokens
      selectTenant(
        {
          tenantId: response.tenantId,
          tenant: tenants.find((t) => t.id === tenantId) || null,
        },
        response.accessToken,
        response.refreshToken
      );

      // Fetch full user context
      const { authService } = await import('../services/authService');
      const userData = await authService.getCurrentUser();
      useAuthStore.getState().updateUserContext(userData);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to select tenant:', err);
      setError(err.response?.data?.error || 'Failed to select tenant');
    } finally {
      setSelecting(false);
    }
  };

  const handleCreateTenant = async () => {
    // For super admins, select global admin context first to allow access to admin routes
    if (isSuperAdmin) {
      try {
        setSelecting(true);
        const response = await tenantService.selectTenant(null);

        // Update auth store with global admin context
        selectTenant(
          {
            tenantId: null,
            tenant: null,
          },
          response.accessToken,
          response.refreshToken
        );

        // Fetch full user context
        const { authService } = await import('../services/authService');
        const userData = await authService.getCurrentUser();
        useAuthStore.getState().updateUserContext(userData);

        // Navigate to create tenant page
        navigate('/admin/tenants/create');
      } catch (err) {
        console.error('Failed to select global admin context:', err);
        setError(err.response?.data?.error || 'Failed to access admin panel');
      } finally {
        setSelecting(false);
      }
    } else {
      navigate('/admin/tenants/create');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isSuperAdmin && error && tenants.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Alert severity="error">{error}</Alert>
          <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
            Back to Login
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <AppHeader showContext={false} />

      {/* Content */}
      <Box sx={{ flex: 1, py: 4 }}>
        <Container maxWidth="md">
          <Typography variant="h5" sx={{ mb: 4, textAlign: 'center' }}>
            Choose a tenant to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Tenant Cards */}
            {tenants.map((tenant) => (
              <Grid item xs={12} sm={6} md={4} key={tenant.id}>
                <Card
                  sx={{
                    height: 200,
                    width: 200,
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <CardActionArea
                    onClick={() => handleTenantSelect(tenant.id)}
                    disabled={selecting}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <CardContent
                      sx={{
                        textAlign: 'center',
                        py: 4,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <Business sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        {tenant.name}
                      </Typography>
                      {tenant.code && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {tenant.code}
                        </Typography>
                      )}
                      {tenant.userRoles && tenant.userRoles.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Roles: {tenant.userRoles.map((ur) => ur.roleName).join(', ')}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}

            {/* Create Tenant Button (Super Admin only) */}
            {isSuperAdmin && (
              <Grid item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    height: 200,
                    width: 200,
                    maxWidth: '100%',
                    border: '2px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <CardActionArea
                    onClick={handleCreateTenant}
                    disabled={selecting}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <CardContent
                      sx={{
                        textAlign: 'center',
                        py: 4,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Create New Tenant
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Set up a new tenant organization
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )}
          </Grid>

          {tenants.length === 0 && !isSuperAdmin && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity="info">
                You don't have access to any tenants. Please contact an administrator.
              </Alert>
              <Button variant="outlined" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
                Back to Login
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
