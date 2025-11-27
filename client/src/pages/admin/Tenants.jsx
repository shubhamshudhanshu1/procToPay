import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';

export default function Tenants() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', status: 'active' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => adminService.getTenants(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
      setOpenDialog(false);
      setFormData({ name: '', code: '', status: 'active' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
      setOpenDialog(false);
      setEditingTenant(null);
      setFormData({ name: '', code: '', status: 'active' });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => adminService.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id) => adminService.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
    },
  });

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setFormData({ name: '', code: '', status: 'active' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      code: tenant.code || '',
      status: tenant.status,
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

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
        {error.response?.data?.error || 'Failed to load tenants'}
      </Alert>
    );
  }

  const tenants = data?.tenants || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Tenants Management
        </Typography>
        {hasPermission('tenant:create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/admin/tenants/create')}
          >
            Create Tenant
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.code || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status}
                    color={
                      tenant.status === 'active'
                        ? 'success'
                        : tenant.status === 'suspended'
                        ? 'warning'
                        : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {hasPermission('tenant:edit') && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(tenant)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  )}
                  {tenant.status === 'active' &&
                    hasPermission('tenant:edit') && (
                      <IconButton
                        size="small"
                        onClick={() => suspendMutation.mutate(tenant.id)}
                        color="warning"
                      >
                        <Block fontSize="small" />
                      </IconButton>
                    )}
                  {tenant.status === 'suspended' &&
                    hasPermission('tenant:edit') && (
                      <IconButton
                        size="small"
                        onClick={() => activateMutation.mutate(tenant.id)}
                        color="success"
                      >
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Tenant Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              fullWidth
            />
            <TextField
              label="Code (Optional)"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              fullWidth
            />
            {editingTenant && (
              <TextField
                select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="deleted">Deleted</MenuItem>
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.name ||
              createMutation.isLoading ||
              updateMutation.isLoading
            }
          >
            {editingTenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

