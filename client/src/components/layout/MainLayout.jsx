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
} from '@mui/material';
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
  Handshake,
  ShowChart,
  Code,
  AssessmentOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useTenantContext } from '../../hooks/useTenantContext';
import AppHeader from './AppHeader';

const drawerWidth = 280;

const menuItems = [
  {
    section: 'ToT Management',
    items: [
      { label: 'ToT Management', icon: Handshake, path: '/tot/management' },
      { label: 'ToT Performance', icon: ShowChart, path: '/tot/performance' },
      { label: 'ToT Gap Analysis', icon: TrendingUp, path: '/tot/gap-analysis' },
    ],
  },
  {
    section: 'Receivable Management',
    items: [
      { label: 'Receivable Schemes', icon: Code, path: '/receivables/schemes' },
      { label: 'Receivable Reports', icon: BarChart, path: '/receivables/reports' },
      { label: 'Receivable Gap Analysis', icon: AssessmentOutlined, path: '/receivables/gap-analysis' },
    ],
  },
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
          { label: 'Master Data', icon: Storage, path: '/settings/master-data' },
          { label: 'Scheme Setup', icon: Settings, path: '/settings/scheme-setup' },
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

  const isActive = (path) => location.pathname === path;

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
            <Box key={section.section} sx={{ mb: sectionIndex < menuItems.length - 1 ? 1 : 0 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 2.5,
                  py: 0.75,
                  color: '#495057',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {section.section}
              </Typography>
              <List dense sx={{ py: 0 }}>
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <ListItem key={item.path} disablePadding sx={{ px: 1.5, py: 0 }}>
                      <ListItemButton
                        onClick={() => navigate(item.path)}
                        sx={{
                          borderRadius: 1,
                          backgroundColor: active ? '#F0F0F0' : 'transparent',
                          '&:hover': {
                            backgroundColor: active ? '#F0F0F0' : '#FAFAFA',
                          },
                          py: 0.75,
                          minHeight: 40,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            color: active ? '#212529' : '#495057',
                          }}
                        >
                          <item.icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: active ? 600 : 500,
                            color: active ? '#212529' : '#495057',
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
        <AppHeader />

        {/* Page Content */}
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
