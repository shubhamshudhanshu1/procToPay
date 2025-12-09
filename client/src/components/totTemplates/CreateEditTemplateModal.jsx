import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Chip,
  Typography,
  MenuItem,
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';
import { totTemplateService } from '../../services/totTemplateService';
import RichTextEditor from '../ui/RichTextEditor';

const TEMPLATE_TYPES = [
  { value: 'VOLUME_BASED', label: 'Volume Based' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'LAUNCH_SUPPORT', label: 'Launch Support' },
  { value: 'CLEARANCE', label: 'Clearance' },
];

const PARAMETER_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export default function CreateEditTemplateModal({ open, onClose, onSuccess, template = null }) {
  const isEdit = !!template;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'VOLUME_BASED',
    content: '',
    status: 'draft',
    parameters: [],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        type: template.type || 'VOLUME_BASED',
        content: template.content || '',
        status: template.status || 'draft',
        parameters: template.parameters || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'VOLUME_BASED',
        content: '',
        status: 'draft',
        parameters: [],
      });
    }
  }, [template, open]);

  const createMutation = useMutation({
    mutationFn: (data) => totTemplateService.createTemplate(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => totTemplateService.updateTemplate(id, data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = () => {
    // Check if content is empty or only contains empty HTML tags
    const contentText = formData.content?.replace(/<[^>]*>/g, '').trim();
    if (!formData.name || !contentText) {
      return;
    }

    const submitData = {
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
      content: formData.content,
      status: formData.status,
      parameters: formData.parameters,
    };

    if (isEdit) {
      updateMutation.mutate({ id: template.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleAddParameter = () => {
    setFormData({
      ...formData,
      parameters: [
        ...formData.parameters,
        {
          name: '',
          type: 'text',
          label: '',
          description: '',
          required: false,
          defaultValue: '',
          order: formData.parameters.length,
        },
      ],
    });
  };

  const handleRemoveParameter = (index) => {
    const newParameters = formData.parameters.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      parameters: newParameters.map((p, i) => ({ ...p, order: i })),
    });
  };

  const handleParameterChange = (index, field, value) => {
    const newParameters = [...formData.parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setFormData({ ...formData, parameters: newParameters });
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  const handleClose = () => {
    // Blur any focused elements before closing to prevent aria-hidden warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {isEdit ? 'Edit Template' : 'Create New Document Template'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />

          <TextField
            select
            label="Template Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            fullWidth
          >
            {TEMPLATE_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Parameters Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Parameters</Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={handleAddParameter}
                variant="outlined"
              >
                Add Parameter
              </Button>
            </Box>
            {formData.parameters.map((param, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  gap: 1,
                  mb: 1,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <TextField
                  label="Name"
                  value={param.name}
                  onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                  placeholder="e.g., minVolume"
                />
                <TextField
                  select
                  label="Type"
                  value={param.type}
                  onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                  size="small"
                  sx={{ minWidth: 150 }}
                >
                  {PARAMETER_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Label"
                  value={param.label}
                  onChange={(e) => handleParameterChange(index, 'label', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  onClick={() => handleRemoveParameter(index)}
                  size="small"
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {formData.parameters.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No parameters added. Click "Add Parameter" to add one.
              </Typography>
            )}
          </Box>

          <RichTextEditor
            label="Template Content"
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            placeholder="Enter template content... Use {{parameterName}} to reference parameters"
            helperText="Use {{parameterName}} to reference parameters. You can format text, add lists, and align content."
            sx={{ width: '100%' }}
          />

          {isEdit && (
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              fullWidth
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !formData.name ||
            !formData.content?.replace(/<[^>]*>/g, '').trim() ||
            isLoading
          }
        >
          {isEdit ? 'Update' : 'Create Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

