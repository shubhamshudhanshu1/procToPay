import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Business,
  AdminPanelSettings,
  Security,
  People,
  Assignment,
  History,
} from '@mui/icons-material';
import { usePermissions } from '../../hooks/usePermissions';
import AppHeader from '../../components/layout/AppHeader';

const drawerWidth = 240;

const adminMenuItems = [
  { label: 'Tenants', icon: Business, path: '/admin/tenants', permission: 'tenant:view' },
  { label: 'Roles', icon: Security, path: '/admin/roles', permission: 'role:view' },
  {
    label: 'Permissions',
    icon: Assignment,
    path: '/admin/permissions',
    permission: 'permission:view',
  },
  { label: 'Users', icon: People, path: '/admin/users', permission: 'user:view' },
  { label: 'Audit Logs', icon: History, path: '/admin/audit-logs', permission: 'audit:view' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, hasWildcardPermission } = usePermissions();

  // Filter menu items based on permissions
  // Users with wildcard permission ('*') have all permissions
  const visibleMenuItems = adminMenuItems.filter(
    (item) => hasWildcardPermission() || hasPermission(item.permission)
  );

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
      {/* Admin Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid #E0E0E0',
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2.5,
            py: 1.5,
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              backgroundColor: '#6C757D',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
              ₹
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#343A40', lineHeight: 1.2 }}>
              ProcPay
            </Typography>
            <Typography variant="caption" sx={{ color: '#6C757D', fontSize: '0.7rem' }}>
              by NexProcureAI
            </Typography>
          </Box>
        </Box>

        {/* Admin Section Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #E0E0E0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminPanelSettings sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Administration
            </Typography>
          </Box>
        </Box>

        {/* Admin Navigation Menu */}
        <Box sx={{ overflow: 'auto', flex: 1, pt: 1 }}>
          <List dense>
            {visibleMenuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ px: 1.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 1,
                      backgroundColor: active ? '#F0F0F0' : 'transparent',
                      '&:hover': {
                        backgroundColor: active ? '#F0F0F0' : '#FAFAFA',
                      },
                      py: 1,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: active ? '#343A40' : '#6C757D',
                      }}
                    >
                      <item.icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 400,
                        color: active ? '#343A40' : '#6C757D',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#F5F5F5',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <AppHeader showContext={true} />

        {/* Admin Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            backgroundColor: '#F5F5F5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
