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
import { usePermissions } from '../hooks/usePermissions';
import { tenantService } from '../services/tenantService';
import { useTenantSelection } from '../hooks/useGlobalAdminContext';
import AppHeader from '../components/layout/AppHeader';

export default function TenantSelection() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { hasPermission } = usePermissions();
  const {
    selectTenantContext,
    selectGlobalAdminContext,
    loading: selecting,
  } = useTenantSelection();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use permission check for UI logic - users with tenant:view permission can access global admin
  const canAccessGlobalAdmin = hasPermission('tenant:view');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenantService.getUserTenants();
      setTenants(response.tenants || []);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      // 401 errors are handled by API interceptor (logout and redirect)
      // Only show error for other errors
      if (err.response?.status !== 401) {
        setError(err.response?.data?.error || 'Failed to load tenants');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId) => {
    try {
      await selectTenantContext({
        tenantId,
        tenant: tenants.find((t) => t.id === tenantId) || null,
        navigateTo: '/dashboard',
        skipIfAlreadySelected: false,
        onError: (err, errorMessage) => {
          setError(errorMessage);
        },
      });
    } catch (err) {
      // Error already handled by onError callback
    }
  };

  const handleCreateTenant = async () => {
    // For users with global admin access, select global admin context first to allow access to admin routes
    if (canAccessGlobalAdmin) {
      try {
        await selectGlobalAdminContext({
          navigateTo: '/admin/tenants/create',
          skipIfAlreadyGlobal: false, // Always select even if already global
          onError: (err, errorMessage) => {
            console.error('Failed to select global admin context:', err);
            setError(errorMessage);
            // Still try to navigate
            navigate('/admin/tenants/create');
          },
        });
      } catch (err) {
        console.error('Error in handleCreateTenant:', err);
        setError(err.response?.data?.error || 'Failed to access admin panel');
        // Still try to navigate
        navigate('/admin/tenants/create');
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

  if (!canAccessGlobalAdmin && error && tenants.length === 0) {
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
          <Button
            variant="contained"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            sx={{ mt: 2 }}
          >
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

            {/* Create Tenant Button (Users with global admin access) */}
            {canAccessGlobalAdmin && (
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

          {tenants.length === 0 && !canAccessGlobalAdmin && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity="info">
                You don't have access to any tenants. Please contact an administrator.
              </Alert>
              <Button
                variant="outlined"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
                sx={{ mt: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
