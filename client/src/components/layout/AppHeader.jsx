import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Groups,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useTenantContext } from '../../hooks/useTenantContext';
import { usePermissions } from '../../hooks/usePermissions';

export default function AppHeader({ title, showContext = true }) {
  const navigate = useNavigate();
  const { logout, user, roles } = useAuthStore();
  const { getContextName, clearTenant, isSuperAdmin, isInGlobalContext } = useTenantContext();
  const { isSuperAdmin: hasSuperAdminRole } = usePermissions();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleSwitchTenant = () => {
    handleMenuClose();
    clearTenant();
    navigate('/tenant-selection');
  };

  const handleAdministration = () => {
    handleMenuClose();
    navigate('/admin/tenants');
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E0E0',
        px: 3,
        py: 1.5,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      {/* Center Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#343A40',
              fontSize: '1rem',
            }}
          >
            {title || 'ProcPay - AI Based Procure to Pay ToT & Scheme Management System'}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: '#6C757D',
            fontSize: '0.875rem',
          }}
        >
          by NexProcureAI
        </Typography>
      </Box>

      {/* Right Section - Context Tag and Avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Tenant Context Tag */}
        {showContext && (
          <Tooltip title="Click to switch tenant">
            <Chip
              label={getContextName()}
              onClick={handleSwitchTenant}
              sx={{
                height: 32,
                fontSize: '0.8125rem',
                fontWeight: 500,
                backgroundColor: '#F0F0F0',
                color: '#343A40',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#E0E0E0',
                },
                '& .MuiChip-label': {
                  px: 1.5,
                },
              }}
            />
          </Tooltip>
        )}

        {/* Avatar Menu */}
        <Box>
          <IconButton
            onClick={handleAvatarClick}
            sx={{
              padding: 0,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: '#6C757D',
                cursor: 'pointer',
              }}
            >
              {getUserInitials()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 280,
                borderRadius: 1,
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            {/* User Details */}
            <Box sx={{ px: 2, py: 2, borderBottom: '1px solid #E0E0E0' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: '#343A40',
                  mb: 0.5,
                }}
              >
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.email || 'User'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#6C757D',
                  fontSize: '0.8125rem',
                  mb: roles && roles.length > 0 ? 1 : 0,
                }}
              >
                {user?.email || 'No email'}
              </Typography>
              {/* Role Tags */}
              {roles && roles.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {roles.map((role) => (
                    <Chip
                      key={role.id || role.slug}
                      label={role.name || role.slug}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor: role.scope === 'global' ? '#E3F2FD' : '#F3E5F5',
                        color: role.scope === 'global' ? '#1976D2' : '#7B1FA2',
                        fontWeight: 500,
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Menu Items */}
            <MenuItem
              onClick={handleProfileClick}
              sx={{
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: '#F0F0F0',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Person fontSize="small" sx={{ color: '#6C757D' }} />
              </ListItemIcon>
              <ListItemText
                primary="Profile"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#343A40',
                }}
              />
            </MenuItem>
            <MenuItem
              onClick={handleSettingsClick}
              sx={{
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: '#F0F0F0',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SettingsIcon fontSize="small" sx={{ color: '#6C757D' }} />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#343A40',
                }}
              />
            </MenuItem>
            <MenuItem
              onClick={handleSwitchTenant}
              sx={{
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: '#F0F0F0',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Groups fontSize="small" sx={{ color: '#6C757D' }} />
              </ListItemIcon>
              <ListItemText
                primary="Switch Tenant"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#343A40',
                }}
              />
            </MenuItem>
            {hasSuperAdminRole && !isInGlobalContext && (
              <MenuItem
                onClick={handleAdministration}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&:hover': {
                    backgroundColor: '#F0F0F0',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AdminPanelSettings fontSize="small" sx={{ color: '#6C757D' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Administration"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    color: '#343A40',
                  }}
                />
              </MenuItem>
            )}
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: '#F0F0F0',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutIcon fontSize="small" sx={{ color: '#6C757D' }} />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: '#343A40',
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
}
