import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { adminService } from '../../services/adminService';
import { usePermissions } from '../../hooks/usePermissions';

export default function CreateTenant() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', code: '', status: 'active' });
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
      navigate('/admin/tenants');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to create tenant';
      setErrors({ submit: errorMessage });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Tenant name is required' });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  if (!hasPermission('tenant:create')) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 3 }}>
          You do not have permission to create tenants.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/tenants')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Create New Tenant
          </Typography>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 4 }}>
          {errors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.submit}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Tenant Name"
              value={formData.name}
              onChange={handleChange('name')}
              required
              fullWidth
              error={!!errors.name}
              helperText={errors.name}
              sx={{ mb: 3 }}
              autoFocus
            />

            <TextField
              label="Code (Optional)"
              value={formData.code}
              onChange={handleChange('code')}
              fullWidth
              helperText="A unique code identifier for this tenant"
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/tenants')}
                disabled={createMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  !formData.name.trim() ||
                  createMutation.isLoading
                }
              >
                {createMutation.isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

