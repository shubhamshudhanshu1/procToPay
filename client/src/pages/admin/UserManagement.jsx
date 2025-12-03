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
import { Search, Add, Edit } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';

export default function UserManagement() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchFilter, setSearchFilter] = useState(''); // Actual filter applied
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [userGlobalRoles, setUserGlobalRoles] = useState([]);
  const [originalUserGlobalRoles, setOriginalUserGlobalRoles] = useState([]); // Track original state
  const [rolesToAdd, setRolesToAdd] = useState([]); // Track roles to be added
  const [rolesToRemove, setRolesToRemove] = useState([]); // Track roles to be removed
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    status: 'active',
  });

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
    mutationFn: ({ userId, roleId }) => adminService.assignGlobalRoleToUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']); // Refresh users list
      queryClient.invalidateQueries(['userGlobalRoles', selectedUser?.id]); // Refresh user roles
      setOpenRoleDialog(false);
      setSelectedUser(null);
      setSelectedRoleId('');
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }) => adminService.revokeGlobalRoleFromUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']); // Refresh users list
      queryClient.invalidateQueries(['userGlobalRoles', selectedUser?.id]); // Refresh user roles
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => adminService.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']); // Refresh users list
      setOpenEditDialog(false);
      setSelectedUser(null);
      setEditFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        status: 'active',
      });
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
    setSelectedUser(user);
    setOpenRoleDialog(true);

    // Fetch user's existing global roles
    try {
      const rolesData = await adminService.getUserGlobalRoles(user.id);
      const roles = rolesData?.roles || [];
      setUserGlobalRoles(roles);
      setOriginalUserGlobalRoles(roles); // Store original state
      setRolesToAdd([]); // Reset pending additions
      setRolesToRemove([]); // Reset pending removals
    } catch (err) {
      console.error('Failed to fetch user roles:', err);
      setUserGlobalRoles([]);
      setOriginalUserGlobalRoles([]);
      setRolesToAdd([]);
      setRolesToRemove([]);
    }
  };

  const handleAddRoleToList = () => {
    if (!selectedRoleId) return;

    // Find the selected role from global roles
    const roleToAdd = globalRoles.find((r) => r.id === selectedRoleId);
    if (!roleToAdd) return;

    // Add to pending additions
    setRolesToAdd([...rolesToAdd, roleToAdd]);

    // Add to current display list
    setUserGlobalRoles([...userGlobalRoles, { id: roleToAdd.id, name: roleToAdd.name, slug: roleToAdd.slug }]);

    // Clear selection
    setSelectedRoleId('');
  };

  const handleRemoveRoleFromList = (roleId) => {
    // Check if this role was in the original list
    const wasOriginal = originalUserGlobalRoles.some((r) => r.id === roleId);

    if (wasOriginal) {
      // Mark for removal
      const roleToRemove = userGlobalRoles.find((r) => r.id === roleId);
      setRolesToRemove([...rolesToRemove, roleToRemove]);
    } else {
      // Remove from pending additions
      setRolesToAdd(rolesToAdd.filter((r) => r.id !== roleId));
    }

    // Remove from display list
    setUserGlobalRoles(userGlobalRoles.filter((r) => r.id !== roleId));
  };

  const handleSaveRoleChanges = async () => {
    if (!selectedUser) return;

    try {
      // Process removals first
      for (const role of rolesToRemove) {
        await adminService.revokeGlobalRoleFromUser(selectedUser.id, role.id);
      }

      // Process additions
      for (const role of rolesToAdd) {
        await adminService.assignGlobalRoleToUser(selectedUser.id, role.id);
      }

      // Refresh data
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['userGlobalRoles', selectedUser?.id]);

      // Close dialog and reset state
      setOpenRoleDialog(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      setUserGlobalRoles([]);
      setOriginalUserGlobalRoles([]);
      setRolesToAdd([]);
      setRolesToRemove([]);
    } catch (error) {
      console.error('Failed to save role changes:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleOpenEditDialog = (user) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      status: user.status || 'active',
    });
    setOpenEditDialog(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const updateData = {};
    if (editFormData.firstName !== selectedUser.firstName) {
      updateData.firstName = editFormData.firstName;
    }
    if (editFormData.lastName !== selectedUser.lastName) {
      updateData.lastName = editFormData.lastName;
    }
    if (editFormData.email !== selectedUser.email) {
      updateData.email = editFormData.email;
    }
    if (editFormData.phoneNumber !== selectedUser.phoneNumber) {
      updateData.phoneNumber = editFormData.phoneNumber || null;
    }
    if (editFormData.status !== selectedUser.status) {
      updateData.status = editFormData.status;
    }

    if (Object.keys(updateData).length === 0) {
      setOpenEditDialog(false);
      return;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: updateData,
    });
  };

  // Check if there are any pending changes
  const hasChanges = rolesToAdd.length > 0 || rolesToRemove.length > 0;
  // Filter for global roles only (tenantId === null)
  const globalRoles = (rolesData?.roles || []).filter(
    (role) => role.tenantId === null || role.tenantId === undefined
  );
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
              <TableCell>Roles</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 400 }}>
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Chip
                            key={role.id}
                            label={role.name}
                            size="small"
                            color={role.isGlobal ? 'primary' : 'default'}
                            title={role.isGlobal ? 'Global Role' : `Tenant: ${role.tenantName || 'Unknown'}`}
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No roles
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {hasPermission('user:edit') && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(user)}
                            title="Edit User"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenRoleDialog(user)}
                            title="Assign Global Role"
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
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
          Assign Global Role to{' '}
          {selectedUser?.firstName && selectedUser?.lastName
            ? `${selectedUser.firstName} ${selectedUser.lastName}`
            : selectedUser?.firstName || selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Show existing global roles */}
            {userGlobalRoles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Current Global Roles:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {userGlobalRoles.map((role) => (
                    <Chip
                      key={role.id}
                      label={role.name}
                      size="small"
                      onDelete={() => {
                        handleRemoveRoleFromList(role.id);
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              select
              label="Select Global Role to Assign"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            >
              {globalRoles
                .filter((role) => !userGlobalRoles.some((ur) => ur.id === role.id))
                .map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
            </TextField>
            <Button
              onClick={handleAddRoleToList}
              variant="outlined"
              disabled={!selectedRoleId}
              sx={{ mt: 1 }}
              fullWidth
            >
              Add Role
            </Button>
            {globalRoles.filter((role) => !userGlobalRoles.some((ur) => ur.id === role.id))
              .length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  All available global roles are already assigned
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
              setUserGlobalRoles([]);
              setOriginalUserGlobalRoles([]);
              setRolesToAdd([]);
              setRolesToRemove([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveRoleChanges}
            variant="contained"
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setSelectedUser(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User{' '}
          {selectedUser?.firstName && selectedUser?.lastName
            ? `${selectedUser.firstName} ${selectedUser.lastName}`
            : selectedUser?.firstName || selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              value={editFormData.firstName}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
              fullWidth
            />

            <TextField
              label="Last Name"
              value={editFormData.lastName}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
              fullWidth
            />

            <TextField
              label="Email"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              fullWidth
            />

            <TextField
              label="Phone Number"
              value={editFormData.phoneNumber || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
              fullWidth
            />

            <TextField
              select
              label="Status"
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="locked">Locked</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenEditDialog(false);
              setSelectedUser(null);
            }}
            disabled={updateUserMutation.isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={updateUserMutation.isLoading}
          >
            {updateUserMutation.isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
