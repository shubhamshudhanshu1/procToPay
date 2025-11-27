import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { Box, Typography, Button } from '@mui/material';

/**
 * Protected Route with Permission Check
 *
 * Extends ProtectedRoute to also check for specific permissions.
 * Shows access denied message if user doesn't have required permission.
 */
export default function ProtectedRouteWithPermission({
  children,
  permission,
  anyPermission,
  allPermissions,
}) {
  const { isAuthenticated, requiresTenantSelection } = useAuthStore();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if tenant selection is needed
  if (requiresTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // Check permissions
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAnyPermission(anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions);
  }

  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="error">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You don't have permission to access this page.
        </Typography>
        <Button variant="contained" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Box>
    );
  }

  return children;
}
