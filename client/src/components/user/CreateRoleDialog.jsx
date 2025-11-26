import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Dialog, Input, Button, Checkbox } from '../ui';

const PERMISSIONS = [
  { value: 'schemes', label: 'schemes' },
  { value: 'gap-analysis', label: 'gap-analysis' },
  { value: 'procurement', label: 'procurement' },
  { value: 'integration-settings', label: 'integration-settings' },
  { value: 'reports', label: 'reports' },
  { value: 'data-upload', label: 'data-upload' },
  { value: 'user-management', label: 'user-management' },
];

const CreateRoleDialog = ({ open, onClose, onSubmit }) => {
  const theme = useTheme();
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const handlePermissionChange = (permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleSubmit = () => {
    if (!roleName.trim()) {
      return;
    }
    onSubmit({
      name: roleName.trim(),
      description: description.trim(),
      permissions: selectedPermissions,
    });
    handleClose();
  };

  const handleClose = () => {
    setRoleName('');
    setDescription('');
    setSelectedPermissions([]);
    onClose();
  };

  // Split permissions into two columns
  const leftColumn = PERMISSIONS.slice(0, 4);
  const rightColumn = PERMISSIONS.slice(4);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      title={null}
      closeButton={false}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          maxWidth: '600px',
        },
      }}
    >
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Close />
        </IconButton>

        {/* Header */}
        <Box sx={{ mb: 3, pr: 4 }}>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Create New Role
          </Typography>
          <Typography variant="body2">Define a new role with permissions.</Typography>
        </Box>

        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Role Name */}
            <Box>
              <Input
                label="Role Name"
                placeholder="Enter role name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
            </Box>

            {/* Description */}
            <Box>
              <Input
                label="Description"
                placeholder="Enter role description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
              />
            </Box>

            {/* Permissions */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Permissions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {leftColumn.map((permission) => (
                      <Checkbox
                        key={permission.value}
                        label={permission.label}
                        checked={selectedPermissions.includes(permission.value)}
                        onChange={() => handlePermissionChange(permission.value)}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {rightColumn.map((permission) => (
                      <Checkbox
                        key={permission.value}
                        label={permission.label}
                        checked={selectedPermissions.includes(permission.value)}
                        onChange={() => handlePermissionChange(permission.value)}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 0, justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!roleName.trim()}
            fullWidth
            sx={{ py: 1.25 }}
          >
            Create Role
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CreateRoleDialog;
