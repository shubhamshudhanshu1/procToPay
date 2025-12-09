import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import TenantSelection from './pages/TenantSelection';
import Dashboard from './pages/Dashboard';
import UserManagementTenant from './pages/UserManagement';
import AdminLayout from './pages/admin/AdminLayout';
import Tenants from './pages/admin/Tenants';
import CreateTenant from './pages/admin/CreateTenant';
import Roles from './pages/admin/Roles';
import Permissions from './pages/admin/Permissions';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import TotTemplates from './pages/TotTemplates';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedRouteWithPermission from './components/ProtectedRouteWithPermission';
import AuthInitializer from './components/AuthInitializer';
import RootRedirect from './components/RootRedirect';
import { theme } from './theme';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthInitializer>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route
                path="/tenant-selection"
                element={
                  <ProtectedRoute>
                    <TenantSelection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute>
                    <UserManagementTenant />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/tot-templates"
                element={
                  <ProtectedRoute>
                    <TotTemplates />
                  </ProtectedRoute>
                }
              />
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRouteWithPermission permission="tenant:view">
                    <AdminLayout />
                  </ProtectedRouteWithPermission>
                }
              >
                <Route
                  path="tenants"
                  element={
                    <ProtectedRouteWithPermission permission="tenant:view">
                      <Tenants />
                    </ProtectedRouteWithPermission>
                  }
                />
                <Route
                  path="tenants/create"
                  element={
                    <ProtectedRouteWithPermission permission="tenant:create">
                      <CreateTenant />
                    </ProtectedRouteWithPermission>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <ProtectedRouteWithPermission permission="role:view">
                      <Roles />
                    </ProtectedRouteWithPermission>
                  }
                />
                <Route
                  path="permissions"
                  element={
                    <ProtectedRouteWithPermission permission="permission:view">
                      <Permissions />
                    </ProtectedRouteWithPermission>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRouteWithPermission permission="user:view">
                      <UserManagement />
                    </ProtectedRouteWithPermission>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRouteWithPermission permission="audit:view">
                      <AuditLogs />
                    </ProtectedRouteWithPermission>
                  }
                />
              </Route>
              <Route path="/" element={<RootRedirect />} />
            </Routes>
          </AuthInitializer>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
