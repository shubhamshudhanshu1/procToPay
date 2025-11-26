import { useState } from 'react';
import { Box, Typography, Grid, useTheme } from '@mui/material';
import { Groups, Lock, PersonAdd, Add } from '@mui/icons-material';
import { Button } from '../components/ui';
import MainLayout from '../components/layout/MainLayout';
import { UserCard, RoleCard } from '../components/user';
import CreateRoleDialog from '../components/user/CreateRoleDialog';

// Mock data - replace with actual API calls
const initialUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@mail.com',
    role: 'Admin',
    lastLogin: '2024-01-15',
    active: true,
  },
  {
    id: 2,
    name: 'Sales Manager',
    email: 'sales@mail.com',
    role: 'Sales Manager',
    lastLogin: '2024-01-14',
    active: true,
  },
];

const initialRoles = [
  {
    id: 1,
    name: 'Admin',
    description: 'Full system access',
    permissions: ['all'],
    active: true,
  },
  {
    id: 2,
    name: 'Sales Manager',
    description: 'Sales and scheme management',
    permissions: ['schemes', 'reports', 'gap-analysis'],
    active: true,
  },
  {
    id: 3,
    name: 'Procurement Manager',
    description: 'Procurement and data upload',
    permissions: ['data-upload', 'procurement', 'reports'],
    active: true,
  },
];

const UserManagement = () => {
  const theme = useTheme();
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);

  const handleUserToggle = (id, active) => {
    setUsers(users.map((user) => (user.id === id ? { ...user, active } : user)));
  };

  const handleUserEdit = (id) => {
    console.log('Edit user:', id);
    // TODO: Open edit dialog
  };

  const handleUserDelete = (id) => {
    setUsers(users.filter((user) => user.id !== id));
  };

  const handleRoleToggle = (id, active) => {
    setRoles(roles.map((role) => (role.id === id ? { ...role, active } : role)));
  };

  const handleRoleEdit = (id) => {
    console.log('Edit role:', id);
    // TODO: Open edit dialog
  };

  const handleRoleDelete = (id) => {
    setRoles(roles.filter((role) => role.id !== id));
  };

  const handleAddUser = () => {
    console.log('Add user');
    // TODO: Open add user dialog
  };

  const handleAddRole = () => {
    setCreateRoleDialogOpen(true);
  };

  const handleCreateRole = (roleData) => {
    const newRole = {
      id: roles.length + 1,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      active: true,
    };
    setRoles([...roles, newRole]);
  };

  return (
    <MainLayout>
      <Box>
        {/* Page Header */}
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          User & Role Management
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Manage users and their roles in the system
        </Typography>

        {/* Two Column Layout */}
        <Grid container spacing={2} sx={{ width: '100%', margin: 0, maxWidth: '100%' }}>
          {/* Users Section */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{ maxWidth: 'calc(50% - 8px)', flexBasis: 'calc(50% - 8px)' }}
          >
            <Box
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: 1,
                border: `1px solid ${theme.palette.border?.main || '#E0E0E0'}`,
                p: 2.5,
                height: '100%',
              }}
            >
              {/* Section Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Groups sx={{ color: 'secondary.main', fontSize: '1.25rem' }} />
                  <Typography variant="h6">Users</Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<PersonAdd />}
                  onClick={handleAddUser}
                >
                  Add User
                </Button>
              </Box>

              {/* Users List */}
              <Box>
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onToggle={handleUserToggle}
                    onEdit={handleUserEdit}
                    onDelete={handleUserDelete}
                  />
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Roles & Permissions Section */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{ maxWidth: 'calc(50% - 8px)', flexBasis: 'calc(50% - 8px)' }}
          >
            <Box
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: 1,
                border: `1px solid ${theme.palette.border?.main || '#E0E0E0'}`,
                p: 2.5,
                height: '100%',
              }}
            >
              {/* Section Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock sx={{ color: 'secondary.main', fontSize: '1.25rem' }} />
                  <Typography variant="h6">Roles & Permissions</Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddRole}
                >
                  Add Role
                </Button>
              </Box>

              {/* Roles List */}
              <Box>
                {roles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onToggle={handleRoleToggle}
                    onEdit={handleRoleEdit}
                    onDelete={handleRoleDelete}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={createRoleDialogOpen}
        onClose={() => setCreateRoleDialogOpen(false)}
        onSubmit={handleCreateRole}
      />
    </MainLayout>
  );
};

export default UserManagement;
