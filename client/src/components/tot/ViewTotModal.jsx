import { useState } from 'react';
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
  Grid,
  Paper,
  Collapse,
} from '@mui/material';
import { Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import { totAgreementService } from '../../services/totAgreementService';
import StatusChip from '../ui/StatusChip';
import { formatParameterValue, renderTemplateContent } from '../../utils/totUtils';

export default function ViewTotModal({ open, onClose, agreementId }) {
  const [contentExpanded, setContentExpanded] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['totAgreement', agreementId],
    queryFn: () => totAgreementService.getAgreement(agreementId),
    enabled: open && !!agreementId,
  });

  const agreement = data?.agreement;

  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setContentExpanded(false);
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth disableRestoreFocus>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">View Terms of Trade</Typography>
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
            {error.response?.data?.error || 'Failed to load agreement'}
          </Alert>
        ) : agreement ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {/* General Information */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                General Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {agreement.name}
                  </Typography>
                </Grid>
                <Grid item size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Brand
                  </Typography>
                  <Typography variant="body1">{agreement.brand?.name || '-'}</Typography>
                </Grid>
                <Grid item size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Template
                  </Typography>
                  <Typography variant="body1">{agreement.template?.name || '-'}</Typography>
                </Grid>
                <Grid item size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip value={agreement.status} size="small" />
                  </Box>
                </Grid>
                <Grid item size={{ xs: 12, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1">{formatDate(agreement.startDate)}</Typography>
                </Grid>
                <Grid item size={{ xs: 12, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    End Date
                  </Typography>
                  <Typography variant="body1">{formatDate(agreement.endDate)}</Typography>
                </Grid>
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Categories
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {agreement.categories && agreement.categories.length > 0 ? (
                      agreement.categories.map((category) => (
                        <Chip key={category.id} label={category.name} size="small" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No categories selected
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Template Parameters */}
            {agreement.template?.parameters && agreement.template.parameters.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Template Parameters
                </Typography>
                <Grid container spacing={2}>
                  {agreement.template.parameters.map((param) => {
                    const value = agreement.parameters?.[param.name];
                    return (
                      <Grid item size={{ xs: 12, sm: 6 }} key={param.id}>
                        <Typography variant="caption" color="text.secondary">
                          {param.label || param.name}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatParameterValue(value, param.type) || '-'}
                        </Typography>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}

            {/* Template Content Preview */}
            {agreement.template?.content && (
              <Paper
                variant="outlined"
                sx={{
                  border: '1px solid #E0E0E0',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  onClick={() => setContentExpanded(!contentExpanded)}
                  sx={{
                    p: 2,
                    borderBottom: contentExpanded ? '1px solid #E0E0E0' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F5F5F5',
                    '&:hover': {
                      backgroundColor: '#EEEEEE',
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529' }}>
                    Content
                  </Typography>
                  <IconButton size="small">
                    {contentExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={contentExpanded}>
                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      minHeight: 200,
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderTemplateContent(agreement.template, agreement.parameters || {}),
                    }}
                  />
                </Collapse>
              </Paper>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
