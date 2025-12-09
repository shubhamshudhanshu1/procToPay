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
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { totTemplateService } from '../../services/totTemplateService';
import StatusChip from '../ui/StatusChip';

export default function ViewTemplateModal({ open, onClose, templateId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['totTemplate', templateId],
    queryFn: () => totTemplateService.getTemplate(templateId),
    enabled: open && !!templateId,
  });

  const template = data?.template;

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
          <Typography variant="h6">
            Template: {template?.name || 'Loading...'}
          </Typography>
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
            {error.response?.data?.error || 'Failed to load template'}
          </Alert>
        ) : template ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Details Section */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusChip value={template.type} size="small" />
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusChip value={template.status} size="small" />
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Version
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {template.version}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Created By
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {template.creator
                    ? `${template.creator.firstName || ''} ${template.creator.lastName || ''}`.trim() ||
                      template.creator.email
                    : '-'}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Description */}
            {template.description && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </Box>
            )}

            {/* Parameters */}
            {template.parameters && template.parameters.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Parameters
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {template.parameters.map((param) => (
                    <Chip
                      key={param.id}
                      label={`${param.name} (${param.type})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Divider />

            {/* Template Content */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Template Content
              </Typography>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  minHeight: '200px',
                  '& *': {
                    margin: 0,
                  },
                  '& p': {
                    marginBottom: '0.5rem',
                    '&:last-child': {
                      marginBottom: 0,
                    },
                  },
                  '& ul, & ol': {
                    paddingLeft: '1.5rem',
                    marginBottom: '0.5rem',
                  },
                  '& h1, & h2, & h3': {
                    marginTop: '1rem',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                  },
                  '& h1': { fontSize: '1.5rem' },
                  '& h2': { fontSize: '1.25rem' },
                  '& h3': { fontSize: '1.125rem' },
                }}
                dangerouslySetInnerHTML={{ __html: template.content }}
              />
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

