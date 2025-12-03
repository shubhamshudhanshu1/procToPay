import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Root redirect - simple logic based on auth state
 */
const RootRedirect = () => {
  const { isAuthenticated, tenantId, permissions } = useAuthStore();

  if (!isAuthenticated || !permissions || permissions.length === 0) {
    return <Navigate to="/login" replace />;
  }

  if (tenantId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permissions.includes('tenant:view') || permissions.includes('*')) {
    return <Navigate to="/admin/tenants" replace />;
  }

  return <Navigate to="/tenant-selection" replace />;
};

export default RootRedirect;

