import { Box, Typography, IconButton, Switch, useTheme } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { Chip } from '../ui';

const RoleCard = ({ role, onToggle, onEdit, onDelete }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        border: `1px solid ${theme.palette.border?.main || '#E0E0E0'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1.5,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
          {role.name}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {role.description}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {role.permissions.map((permission, index) => (
            <Chip key={index} label={permission} size="small" />
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={role.active}
          onChange={(e) => onToggle(role.id, e.target.checked)}
          size="small"
          color="secondary"
        />
        <IconButton size="small" onClick={() => onEdit(role.id)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(role.id)}>
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default RoleCard;
