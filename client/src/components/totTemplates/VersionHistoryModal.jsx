import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { totTemplateService } from '../../services/totTemplateService';
import StatusChip from '../ui/StatusChip';

export default function VersionHistoryModal({ open, onClose, templateId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['totTemplateVersions', templateId],
    queryFn: () => totTemplateService.getVersionHistory(templateId),
    enabled: open && !!templateId,
  });

  const versions = data?.versions || [];

  const handleClose = () => {
    // Blur any focused elements before closing to prevent aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth disableRestoreFocus>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Version History</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">
            {error.response?.data?.error || 'Failed to load version history'}
          </Alert>
        ) : versions.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No version history available
          </Typography>
        ) : (
          <List>
            {versions.map((version, index) => (
              <Box key={version.id}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 2,
                  }}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={version.version} size="small" color="primary" />
                      <StatusChip value={version.status} size="small" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(version.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Created by:{' '}
                    {version.creator
                      ? `${version.creator.firstName || ''} ${version.creator.lastName || ''}`.trim() ||
                        version.creator.email
                      : 'Unknown'}
                  </Typography>
                  {version.changeNotes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {version.changeNotes}
                    </Typography>
                  )}
                  {version.parameters && Array.isArray(version.parameters) && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Parameters: {version.parameters.length}
                      </Typography>
                    </Box>
                  )}
                </ListItem>
                {index < versions.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
