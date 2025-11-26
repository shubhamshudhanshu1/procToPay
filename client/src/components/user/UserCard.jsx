import { Box, Typography, IconButton, Switch, useTheme } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { Chip } from '../ui';

const UserCard = ({ user, onToggle, onEdit, onDelete }) => {
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
          {user.name}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {user.email}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Chip label={user.role} size="small" />
        </Box>
        <Typography variant="caption">Last login: {user.lastLogin}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={user.active}
          onChange={(e) => onToggle(user.id, e.target.checked)}
          size="small"
          color="secondary"
        />
        <IconButton size="small" onClick={() => onEdit(user.id)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(user.id)}>
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default UserCard;
