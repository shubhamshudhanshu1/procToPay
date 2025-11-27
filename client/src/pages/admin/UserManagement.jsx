import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
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
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantContext } from '../../hooks/useTenantContext';

export default function UserManagement() {
  const { hasPermission } = usePermissions();
  const { tenantId, isInTenantContext } = useTenantContext();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchFilter, setSearchFilter] = useState(''); // Actual filter applied
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [userRolesInTenant, setUserRolesInTenant] = useState([]);

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminService.getRoles(),
    enabled: openRoleDialog,
  });

  // Fetch all users with optional search filter
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['users', searchFilter],
    queryFn: () => adminService.getUsers({ email: searchFilter || undefined }),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ tenantId, userId, roleId }) =>
      adminService.assignRoleToUser(tenantId, userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenantUsers', tenantId]);
      queryClient.invalidateQueries(['userRoles', tenantId]);
      queryClient.invalidateQueries(['users']); // Refresh users list
      setOpenRoleDialog(false);
      setSelectedUser(null);
      setSelectedRoleId('');
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ tenantId, userId, roleId }) =>
      adminService.revokeRoleFromUser(tenantId, userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenantUsers', tenantId]);
      queryClient.invalidateQueries(['userRoles', tenantId]);
      queryClient.invalidateQueries(['users']); // Refresh users list
    },
  });

  const handleSearch = () => {
    // Apply search filter
    setSearchFilter(searchEmail.trim());
  };

  const handleClearSearch = () => {
    setSearchEmail('');
    setSearchFilter('');
  };

  const handleOpenRoleDialog = async (user) => {
    if (!isInTenantContext || !tenantId) {
      alert('Please select a tenant context first to assign roles');
      return;
    }

    setSelectedUser(user);
    setOpenRoleDialog(true);

    // Fetch user's existing roles in tenant
    if (tenantId) {
      try {
        const rolesData = await adminService.getUserRoles(tenantId, user.id);
        setUserRolesInTenant(rolesData?.roles || []);
      } catch (err) {
        console.error('Failed to fetch user roles:', err);
        setUserRolesInTenant([]);
      }
    }
  };

  const handleAssignRole = () => {
    if (!selectedRoleId || !selectedUser || !tenantId) return;

    assignRoleMutation.mutate({
      tenantId,
      userId: selectedUser.id,
      roleId: selectedRoleId,
    });
  };

  const handleRevokeRole = (userId, roleId) => {
    if (!userId || !tenantId) return;

    revokeRoleMutation.mutate({
      tenantId,
      userId,
      roleId,
    });
  };

  const tenantRoles = (rolesData?.roles || []).filter((role) => role.tenantId !== null && role.tenantId !== undefined);
  const users = usersData?.users || [];

  if (usersLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (usersError) {
    return (
      <Alert severity="error">{usersError.response?.data?.error || 'Failed to load users'}</Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          User Management
        </Typography>

        {/* Search Box */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search by Email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            size="small"
            type="email"
            placeholder="Enter email to filter..."
            sx={{ width: 300 }}
          />
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={handleSearch}
            disabled={usersLoading}
          >
            Search
          </Button>
          {searchFilter && (
            <Button variant="text" onClick={handleClearSearch} size="small">
              Clear
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {searchEmail ? 'No users found matching the search' : 'No users found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.email || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.phoneNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={
                        user.status === 'active'
                          ? 'success'
                          : user.status === 'pending'
                            ? 'warning'
                            : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {hasPermission('user:edit') && isInTenantContext && tenantId && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenRoleDialog(user)}
                        title="Assign Role"
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Assign Role Dialog */}
      <Dialog
        open={openRoleDialog}
        onClose={() => {
          setOpenRoleDialog(false);
          setSelectedUser(null);
          setSelectedRoleId('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign Role to{' '}
          {selectedUser?.firstName && selectedUser?.lastName
            ? `${selectedUser.firstName} ${selectedUser.lastName}`
            : selectedUser?.firstName || selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Show existing roles */}
            {userRolesInTenant.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Current Roles in Tenant:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {userRolesInTenant.map((role) => (
                    <Chip
                      key={role.id}
                      label={role.name}
                      size="small"
                      onDelete={() => {
                        handleRevokeRole(selectedUser.id, role.id);
                        setUserRolesInTenant(userRolesInTenant.filter((r) => r.id !== role.id));
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              select
              label="Select Role to Assign"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            >
              {tenantRoles
                .filter((role) => !userRolesInTenant.some((ur) => ur.id === role.id))
                .map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name} ({role.tenantId === null || role.tenantId === undefined ? 'Global' : 'Tenant'})
                  </MenuItem>
                ))}
            </TextField>
            {tenantRoles.filter((role) => !userRolesInTenant.some((ur) => ur.id === role.id))
              .length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                All available roles are already assigned
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenRoleDialog(false);
              setSelectedUser(null);
              setSelectedRoleId('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            variant="contained"
            disabled={!selectedRoleId || assignRoleMutation.isLoading}
          >
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
