import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
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
  Grid,
} from '@mui/material';
import { Search, Add, Delete } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantContext } from '../../hooks/useTenantContext';

export default function UserManagement() {
  const { hasPermission } = usePermissions();
  const { tenantId, isInTenantContext } = useTenantContext();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => adminService.getRoles(),
    enabled: openRoleDialog,
  });

  const { data: tenantUsersData, isLoading: tenantUsersLoading } = useQuery({
    queryKey: ['tenantUsers', tenantId],
    queryFn: () => adminService.getTenantUsers(tenantId),
    enabled: !!tenantId && isInTenantContext,
  });

  const searchMutation = useMutation({
    mutationFn: (email) => adminService.searchUsers(email),
    onSuccess: (data) => {
      setSearchResult(data.user);
      setSearchError(null);
    },
    onError: (error) => {
      setSearchResult(null);
      setSearchError(error.response?.data?.error || 'User not found');
    },
    onSettled: () => {
      setSearchLoading(false);
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ tenantId, userId, roleId }) =>
      adminService.assignRoleToUser(tenantId, userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenantUsers', tenantId]);
      queryClient.invalidateQueries(['userRoles', tenantId]);
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
    },
  });

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setSearchError('Please enter an email address');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    searchMutation.mutate(searchEmail.trim());
  };

  const handleOpenRoleDialog = (user) => {
    setSelectedUser(user);
    setOpenRoleDialog(true);
  };

  const handleAssignRole = () => {
    if (!selectedRoleId || !selectedUser || !tenantId) return;

    assignRoleMutation.mutate({
      tenantId,
      userId: selectedUser.id,
      roleId: selectedRoleId,
    });
  };

  const handleRevokeRole = (roleId) => {
    if (!selectedUser || !tenantId) return;

    revokeRoleMutation.mutate({
      tenantId,
      userId: selectedUser.id,
      roleId,
    });
  };

  const tenantRoles = (rolesData?.roles || []).filter((role) => role.scope === 'tenant');

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        User Management
      </Typography>

      {/* User Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search User by Email
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Email Address"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              fullWidth
              type="email"
            />
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearch}
              disabled={searchLoading}
            >
              Search
            </Button>
          </Box>

          {searchError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {searchError}
            </Alert>
          )}

          {searchLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {searchResult && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                User Found
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {searchResult.firstName && searchResult.lastName
                      ? `${searchResult.firstName} ${searchResult.lastName}`
                      : searchResult.firstName || searchResult.email || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{searchResult.email}</Typography>
                </Grid>
                {searchResult.existingRoles && searchResult.existingRoles.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Current Roles in Tenant
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {searchResult.existingRoles.map((role) => (
                        <Chip key={role.id} label={role.name} size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  {hasPermission('user:edit') && isInTenantContext && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => handleOpenRoleDialog(searchResult)}
                    >
                      Assign Role
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tenant Users List */}
      {isInTenantContext && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Users in Tenant
            </Typography>
            {tenantUsersLoading ? (
              <CircularProgress />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(tenantUsersData?.users || []).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName || user.email || 'N/A'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {user.roles?.map((role) => (
                              <Chip
                                key={role.id}
                                label={role.name}
                                size="small"
                                onDelete={
                                  hasPermission('user:edit')
                                    ? () => handleRevokeRole(role.id)
                                    : undefined
                                }
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {hasPermission('user:edit') && (
                            <IconButton size="small" onClick={() => handleOpenRoleDialog(user)}>
                              <Add fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

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
        <DialogTitle>Assign Role to {selectedUser?.firstName || selectedUser?.email}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              label="Select Role"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
            >
              {tenantRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name} ({role.scope})
                </MenuItem>
              ))}
            </TextField>
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
