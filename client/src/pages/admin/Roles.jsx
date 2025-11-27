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
  Checkbox,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { Add, Edit, Delete, Security } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';

export default function Roles() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    scope: 'tenant',
    description: '',
    permissionIds: [],
  });
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminService.getRoles(),
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => adminService.getPermissions(),
    enabled: openPermissionsDialog || openDialog,
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setOpenDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setOpenDialog(false);
      setEditingRole(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
    },
  });

  const resetForm = () => {
    setFormData({
      slug: '',
      name: '',
      scope: 'tenant',
      description: '',
      permissionIds: [],
    });
  };

  const handleOpenCreate = () => {
    setEditingRole(null);
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      slug: role.slug,
      name: role.name,
      scope: role.scope,
      description: role.description || '',
      permissionIds: role.rolePermissions?.map((rp) => rp.permissionId) || [],
    });
    setOpenDialog(true);
  };

  const handleOpenPermissions = async (role) => {
    setSelectedRole(role);
    const permissions = await adminService.getRolePermissions(role.id);
    setSelectedPermissions(permissions.permissions.map((p) => p.id));
    setAvailablePermissions(permissionsData?.permissions || []);
    setOpenPermissionsDialog(true);
  };

  const handleSubmit = () => {
    const data = {
      slug: formData.slug,
      name: formData.name,
      scope: formData.scope,
      description: formData.description || undefined,
      permissionIds: formData.permissionIds,
    };

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      await adminService.assignPermissionsToRole(selectedRole.id, selectedPermissions);
      queryClient.invalidateQueries(['roles']);
      setOpenPermissionsDialog(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  if (rolesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (rolesError) {
    return (
      <Alert severity="error">
        {rolesError.response?.data?.error || 'Failed to load roles'}
      </Alert>
    );
  }

  const roles = rolesData?.roles || [];
  const permissions = permissionsData?.permissions || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Roles Management
        </Typography>
        {hasPermission('role:create') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreate}
          >
            Create Role
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                <TableCell>
                  <Chip label={role.slug} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.scope}
                    color={role.scope === 'global' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {role.rolePermissions?.length || 0} permissions
                </TableCell>
                <TableCell>
                  {hasPermission('role:edit') && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenPermissions(role)}
                      title="Manage Permissions"
                    >
                      <Security fontSize="small" />
                    </IconButton>
                  )}
                  {hasPermission('role:edit') && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(role)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  )}
                  {hasPermission('role:delete') && (
                    <IconButton
                      size="small"
                      onClick={() => deleteMutation.mutate(role.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Role Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Role Slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
              fullWidth
              disabled={!!editingRole}
              helperText="Unique identifier (e.g., 'tenant_admin')"
            />
            <TextField
              label="Role Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              fullWidth
            />
            <TextField
              select
              label="Scope"
              value={formData.scope}
              onChange={(e) =>
                setFormData({ ...formData, scope: e.target.value })
              }
              required
              fullWidth
              disabled={!!editingRole}
            >
              <MenuItem value="global">Global</MenuItem>
              <MenuItem value="tenant">Tenant</MenuItem>
            </TextField>
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
            {permissions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Permissions
                </Typography>
                <Grid container spacing={1}>
                  {permissions.map((permission) => (
                    <Grid item xs={12} sm={6} key={permission.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.permissionIds.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  permissionIds: [...formData.permissionIds, permission.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  permissionIds: formData.permissionIds.filter(
                                    (id) => id !== permission.id
                                  ),
                                });
                              }
                            }}
                          />
                        }
                        label={`${permission.module}:${permission.action}`}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.slug ||
              !formData.name ||
              createMutation.isLoading ||
              updateMutation.isLoading
            }
          >
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog
        open={openPermissionsDialog}
        onClose={() => setOpenPermissionsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manage Permissions - {selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          {permissionsLoading ? (
            <CircularProgress />
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {permissions.map((permission) => (
                <Grid item xs={12} sm={6} md={4} key={permission.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {permission.module}:{permission.action}
                        </Typography>
                        {permission.description && (
                          <Typography variant="caption" color="text.secondary">
                            {permission.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPermissionsDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdatePermissions} variant="contained">
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

