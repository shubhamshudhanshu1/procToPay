import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { Add, ExpandMore } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';

export default function Permissions() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    module: '',
    action: '',
    slug: '',
    description: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => adminService.getPermissions(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions']);
      setOpenDialog(false);
      setFormData({ module: '', action: '', slug: '', description: '' });
    },
  });

  const handleOpenCreate = () => {
    setFormData({ module: '', action: '', slug: '', description: '' });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    const data = {
      module: formData.module,
      action: formData.action,
      description: formData.description || undefined,
      // Slug will be auto-generated if not provided
      ...(formData.slug && { slug: formData.slug }),
    };
    createMutation.mutate(data);
  };

  // Group permissions by module
  const groupedPermissions = (data?.permissions || []).reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error.response?.data?.error || 'Failed to load permissions'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Permissions Management
        </Typography>
        {hasPermission('permission:create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreate}
          >
            Create Permission
          </Button>
        )}
      </Box>

      {/* Grouped Permissions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(groupedPermissions).map(([module, permissions]) => (
          <Accordion key={module} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {module.charAt(0).toUpperCase() + module.slice(1)} ({permissions.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Slug</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <Chip label={permission.slug} size="small" />
                        </TableCell>
                        <TableCell>{permission.action}</TableCell>
                        <TableCell>{permission.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Create Permission Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Permission</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Module"
              value={formData.module}
              onChange={(e) => {
                const module = e.target.value;
                setFormData({
                  ...formData,
                  module,
                  slug: formData.slug || `${module}:${formData.action}`,
                });
              }}
              required
              fullWidth
              placeholder="e.g., tenant, user, role"
            />
            <TextField
              label="Action"
              value={formData.action}
              onChange={(e) => {
                const action = e.target.value;
                setFormData({
                  ...formData,
                  action,
                  slug: formData.slug || `${formData.module}:${action}`,
                });
              }}
              required
              fullWidth
              placeholder="e.g., create, view, edit, delete"
            />
            <TextField
              label="Slug (Auto-generated if empty)"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              fullWidth
              helperText="Format: module:action (e.g., tenant:create)"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.module ||
              !formData.action ||
              createMutation.isLoading
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

