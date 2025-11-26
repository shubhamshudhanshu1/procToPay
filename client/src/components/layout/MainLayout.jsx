import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import { Person, Settings as SettingsIcon, Logout as LogoutIcon } from '@mui/icons-material';
import {
  ShoppingCart,
  Inventory2,
  LocalShipping,
  SmartToy,
  BarChart,
  Assessment,
  CloudUpload,
  Description,
  Settings,
  Storage,
  CheckBox,
  TrendingUp,
  Tag,
  QrCode,
  IntegrationInstructions,
  Groups,
  Logout,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const drawerWidth = 280;

const menuItems = [
  {
    section: 'Procurement',
    items: [
      { label: 'Procurement Orders', icon: ShoppingCart, path: '/procurement/orders' },
      { label: 'Inventory Management', icon: Inventory2, path: '/procurement/inventory' },
      { label: 'Supplier Management', icon: LocalShipping, path: '/procurement/suppliers' },
    ],
  },
  {
    section: 'Reports & Analysis',
    items: [
      { label: 'AI Assistant', icon: SmartToy, path: '/reports/ai-assistant' },
      { label: 'Drill Down Analysis', icon: BarChart, path: '/reports/analysis' },
      { label: 'Reports & Dashboards', icon: Assessment, path: '/reports/dashboards' },
    ],
  },
  {
    section: 'Settings & Integration',
    items: [
      { label: 'Data Upload', icon: CloudUpload, path: '/settings/data-upload' },
      { label: 'ToT Templates', icon: Description, path: '/settings/tot-templates' },
      { label: 'Scheme Setup', icon: Settings, path: '/settings/scheme-setup' },
      { label: 'Master Data', icon: Storage, path: '/settings/master-data' },
      { label: 'PO Maker Checker Rules', icon: CheckBox, path: '/settings/po-rules' },
      { label: 'Demand Forecasting', icon: TrendingUp, path: '/settings/forecasting' },
      { label: 'Itemization', icon: Tag, path: '/settings/itemization' },
      { label: 'QR Code/RFID Allocation', icon: QrCode, path: '/settings/qr-allocation' },
      { label: 'Integrations', icon: IntegrationInstructions, path: '/settings/integrations' },
      { label: 'User Management', icon: Groups, path: '/user-management' },
    ],
  },
];

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
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

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

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
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
      {/* Sidebar */}
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

        {/* Navigation Menu */}
        <Box sx={{ overflow: 'auto', flex: 1, pt: 1 }}>
          {menuItems.map((section, sectionIndex) => (
            <Box key={section.section} sx={{ mb: sectionIndex < menuItems.length - 1 ? 2 : 0 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 2.5,
                  py: 1,
                  color: '#6C757D',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {section.section}
              </Typography>
              <List dense>
                {section.items.map((item) => {
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
          ))}
        </Box>

        {/* Logout */}
        <Box sx={{ borderTop: '1px solid #E0E0E0', p: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#FAFAFA',
              },
              py: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: '#6C757D' }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontSize: '0.875rem',
                color: '#6C757D',
              }}
            />
          </ListItemButton>
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
                ProcPay - AI Based Procure to Pay ToT & Scheme Management System
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

          {/* Avatar Menu - Rightmost */}
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
                  }}
                >
                  {user?.email || 'No email'}
                </Typography>
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

        {/* Page Content */}
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
