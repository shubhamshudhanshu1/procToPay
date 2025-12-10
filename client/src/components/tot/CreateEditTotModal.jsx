import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  Chip,
  Grid,
  Autocomplete,
  CircularProgress,
  Alert,
  Paper,
  Collapse,
} from '@mui/material';
import { Close, Description, CloudUpload, ExpandMore, ExpandLess } from '@mui/icons-material';
import { totAgreementService } from '../../services/totAgreementService';
import { totTemplateService } from '../../services/totTemplateService';
import { masterDataService } from '../../services/masterDataService';
import TemplateSelectionCard from './TemplateSelectionCard';
import DynamicForm from '../ui/DynamicForm';
import { useToast } from '../../hooks/useToast';
import { renderTemplateContent } from '../../utils/totUtils';

export default function CreateEditTotModal({ open, onClose, onSuccess, agreement = null }) {
  const isEdit = !!agreement;
  const { toast, showToast, hideToast } = useToast();
  const [creationMethod, setCreationMethod] = useState(0); // 0 = Manual Entry, 1 = Document Upload (disabled)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    startDate: '',
    endDate: '',
    categoryIds: [],
    parameters: {},
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['totTemplates', { status: 'active' }],
    queryFn: () => totTemplateService.getTemplates({ status: 'active', limit: 100 }),
    enabled: open,
  });

  // Fetch selected template details
  const { data: templateData } = useQuery({
    queryKey: ['totTemplate', selectedTemplateId],
    queryFn: () => totTemplateService.getTemplate(selectedTemplateId),
    enabled: open && !!selectedTemplateId,
  });

  // Fetch brands
  const { data: brandsData } = useQuery({
    queryKey: ['brands', { limit: 1000 }],
    queryFn: () => masterDataService.getBrands({ limit: 1000 }),
    enabled: open,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { limit: 1000 }],
    queryFn: () => masterDataService.getCategories({ limit: 1000 }),
    enabled: open,
  });

  const templates = templatesData?.templates || [];
  const selectedTemplate = templateData?.template;
  const brands = brandsData?.brands || [];
  const categories = categoriesData?.categories || [];

  useEffect(() => {
    if (agreement) {
      setFormData({
        name: agreement.name || '',
        brandId: agreement.brandId || '',
        startDate: agreement.startDate ? agreement.startDate.split('T')[0] : '',
        endDate: agreement.endDate ? agreement.endDate.split('T')[0] : '',
        categoryIds: agreement.categories?.map((c) => c.id) || [],
        parameters: agreement.parameters || {},
      });
      setSelectedTemplateId(agreement.templateId);
    } else {
      setFormData({
        name: '',
        brandId: '',
        startDate: '',
        endDate: '',
        categoryIds: [],
        parameters: {},
      });
      setSelectedTemplateId(null);
    }
  }, [agreement, open]);

  // Initialize parameters when template is selected
  useEffect(() => {
    if (selectedTemplate && !isEdit) {
      const initialParams = {};
      selectedTemplate.parameters?.forEach((param) => {
        if (param.defaultValue) {
          initialParams[param.name] = param.defaultValue;
        }
      });
      setFormData((prev) => ({
        ...prev,
        parameters: initialParams,
      }));
    }
  }, [selectedTemplate, isEdit]);

  const createMutation = useMutation({
    mutationFn: (data) => totAgreementService.createAgreement(data),
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      showToast(error.response?.data?.error || 'Failed to create agreement', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => totAgreementService.updateAgreement(id, data),
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      showToast(error.response?.data?.error || 'Failed to update agreement', 'error');
    },
  });

  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setFormData({
      name: '',
      brandId: '',
      startDate: '',
      endDate: '',
      categoryIds: [],
      parameters: {},
    });
    setSelectedTemplateId(null);
    setContentExpanded(false);
    onClose();
  };

  const handleSubmit = () => {
    if (
      !formData.name ||
      !formData.brandId ||
      !selectedTemplateId ||
      !formData.startDate ||
      !formData.endDate
    ) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (formData.categoryIds.length === 0) {
      showToast('Please select at least one category', 'error');
      return;
    }

    if (!selectedTemplate) {
      showToast('Please select a template', 'error');
      return;
    }

    // Validate required parameters
    const requiredParams = selectedTemplate.parameters?.filter((p) => p.required) || [];
    for (const param of requiredParams) {
      if (!(param.name in formData.parameters) || formData.parameters[param.name] === '') {
        showToast(`Required parameter "${param.label || param.name}" is missing`, 'error');
        return;
      }
    }

    const submitData = {
      name: formData.name,
      brandId: formData.brandId,
      templateId: selectedTemplateId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      categoryIds: formData.categoryIds,
      parameters: formData.parameters,
      status: 'draft',
    };

    if (isEdit) {
      updateMutation.mutate({ id: agreement.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleParameterChange = (paramName, value) => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramName]: value,
      },
    }));
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth disableRestoreFocus>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {isEdit ? 'Edit Terms of Trade' : 'Create New Terms of Trade'}
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Creation Method Tabs */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                border: '1px solid #E0E0E0',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Creation Method
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  onClick={() => setCreationMethod(0)}
                  sx={{
                    flex: 1,
                    p: 2,
                    border: creationMethod === 0 ? '2px solid #1976D2' : '1px solid #E0E0E0',
                    borderRadius: 1,
                    backgroundColor: creationMethod === 0 ? '#F5F9FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#1976D2',
                      backgroundColor: creationMethod === 0 ? '#F5F9FF' : '#F5F5F5',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Description
                      sx={{ fontSize: 32, color: creationMethod === 0 ? '#1976D2' : '#9E9E9E' }}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529' }}>
                        Manual Entry
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#757575' }}>
                        Create ToT by filling form manually
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box
                  onClick={() => {
                    showToast('Document Upload is under construction', 'info');
                  }}
                  sx={{
                    flex: 1,
                    p: 2,
                    border: '1px solid #E0E0E0',
                    borderRadius: 1,
                    backgroundColor: '#F5F5F5',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <CloudUpload sx={{ fontSize: 32, color: '#9E9E9E' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529' }}>
                        Document Upload
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#757575' }}>
                        Upload document for AI parsing
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Basic Information */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                border: '1px solid #E0E0E0',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Basic Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="ToT Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter ToT name"
                  required
                  fullWidth
                />
                <TextField
                  select
                  label={formData.brandId ? 'Brand' : ''}
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  placeholder="Select brand"
                  required
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="">Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </TextField>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    type="date"
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    placeholder="dd/mm/yyyy"
                    required
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="date"
                    label="End Date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    placeholder="dd/mm/yyyy"
                    required
                    sx={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Template Selection */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                border: '1px solid #E0E0E0',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Template Selection
              </Typography>
              {templates.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body1" sx={{ color: '#757575', mb: 1 }}>
                    No TOT Templates
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9E9E9E' }}>
                    Create a Template to Continue
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {templates.map((template) => (
                    <Grid item size={{ xs: 12, sm: 6 }} key={template.id}>
                      <TemplateSelectionCard
                        template={template}
                        selected={selectedTemplateId === template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>

            {/* Template Parameters */}
            {selectedTemplate &&
              selectedTemplate.parameters &&
              selectedTemplate.parameters.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    border: '1px solid #E0E0E0',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      backgroundColor: '#E3F2FD',
                      p: 2,
                      borderBottom: '1px solid #E0E0E0',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#212529' }}>
                      Template Parameters - {selectedTemplate.name}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <DynamicForm
                      fields={selectedTemplate.parameters.map((param) => ({
                        name: param.name,
                        label: param.label || param.name,
                        type: param.type,
                        required: param.required,
                        placeholder: `Enter ${param.name}`,
                        helperText: param.description,
                        min: param.type === 'percentage' || param.type === 'number' ? 0 : undefined,
                        max: param.type === 'percentage' ? 100 : undefined,
                      }))}
                      values={formData.parameters}
                      onChange={handleParameterChange}
                      columnsPerRow={2}
                    />
                  </Box>
                </Paper>
              )}

            {/* Product Categories */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                border: '1px solid #E0E0E0',
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Product Categories
              </Typography>
              <Autocomplete
                multiple
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.filter((c) => formData.categoryIds.includes(c.id))}
                onChange={(event, newValue) => {
                  setFormData({
                    ...formData,
                    categoryIds: newValue.map((c) => c.id),
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Select category" placeholder="Select category" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.name} {...getTagProps({ index })} key={option.id} />
                  ))
                }
              />
            </Paper>

            {/* Template Content Preview */}
            {selectedTemplate && selectedTemplate.content && (
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
                      __html: renderTemplateContent(selectedTemplate, formData.parameters),
                    }}
                  />
                </Collapse>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isLoading || updateMutation.isLoading}
          >
            {createMutation.isLoading || updateMutation.isLoading ? (
              <CircularProgress size={20} />
            ) : isEdit ? (
              'Update ToT'
            ) : (
              'Create ToT'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
