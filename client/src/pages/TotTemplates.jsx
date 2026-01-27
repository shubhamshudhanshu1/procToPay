import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Search, Add, MoreVert, Visibility, Edit, ContentCopy, History } from '@mui/icons-material';
import { totTemplateService } from '../services/totTemplateService';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader from '../components/layout/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import MainLayout from '../components/layout/MainLayout';
import CreateEditTemplateModal from '../components/totTemplates/CreateEditTemplateModal';
import ViewTemplateModal from '../components/totTemplates/ViewTemplateModal';
import VersionHistoryModal from '../components/totTemplates/VersionHistoryModal';

const TEMPLATE_TYPES = [
  { value: '', label: 'All' },
  { value: 'VOLUME_BASED', label: 'Volume Based' },
  { value: 'SEASONAL', label: 'Seasonal' },
  { value: 'LAUNCH_SUPPORT', label: 'Launch Support' },
  { value: 'CLEARANCE', label: 'Clearance' },
];

export default function TotTemplates() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openVersionModal, setOpenVersionModal] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplateId, setViewingTemplateId] = useState(null);
  const [versionTemplateId, setVersionTemplateId] = useState(null);

  // Build query params
  const queryParams = {
    page: 1,
    limit: 20,
    ...(searchFilter && { search: searchFilter }),
    ...(typeFilter && { type: typeFilter }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['totTemplates', queryParams],
    queryFn: () => totTemplateService.getTemplates(queryParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => totTemplateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['totTemplates']);
      setOpenDeleteConfirm(false);
      handleMenuClose();
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      alert(error.response?.data?.error || 'Failed to delete template');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }) => totTemplateService.duplicateTemplate(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries(['totTemplates']);
      handleMenuClose();
    },
  });

  const handleSearch = () => {
    setSearchFilter(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilter('');
  };

  const handleMenuOpen = (event, template) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleView = () => {
    if (selectedTemplate) {
      setViewingTemplateId(selectedTemplate.id);
      setOpenViewModal(true);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditingTemplate(selectedTemplate);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleDuplicate = () => {
    const newName = `${selectedTemplate.name} (Copy)`;
    duplicateMutation.mutate({ id: selectedTemplate.id, name: newName });
  };

  const handleVersionHistory = () => {
    if (selectedTemplate) {
      setVersionTemplateId(selectedTemplate.id);
      setOpenVersionModal(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setOpenDeleteConfirm(true);
    handleMenuClose();
  };

  const handleConfirmDelete = () => {
    if (selectedTemplate) {
      deleteMutation.mutate(selectedTemplate.id);
    }
  };

  const handleCreateSuccess = () => {
    setOpenCreateModal(false);
    queryClient.invalidateQueries(['totTemplates']);
  };

  const handleEditSuccess = () => {
    setOpenEditModal(false);
    setEditingTemplate(null);
    queryClient.invalidateQueries(['totTemplates']);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error">{error.response?.data?.error || 'Failed to load templates'}</Alert>
      </MainLayout>
    );
  }

  const templates = data?.templates || [];
  const templateCount = templates.length;

  return (
    <MainLayout>
      <PageHeader
        title="ToT Document Templates"
        subtitle="Manage document templates for Terms of Trade agreements."
        actionLabel="Create Template"
        onAction={() => setOpenCreateModal(true)}
        showCreateButton={hasPermission('tot_template:create')}
      />

      {/* Search and Filter Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          SelectProps={{
            native: true,
          }}
        >
          {TEMPLATE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </TextField>
        {searchFilter && (
          <Button variant="text" onClick={handleClearSearch} size="small">
            Clear
          </Button>
        )}
      </Box>

      {/* Templates Table */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Document Templates ({templateCount})
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Modified</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No templates found. Create your first template to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {template.name}
                      </Typography>
                      {template.description && (
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip value={template.type} size="small" />
                    </TableCell>
                    <TableCell>{template.version}</TableCell>
                    <TableCell>
                      <StatusChip value={template.status} size="small" />
                    </TableCell>
                    <TableCell>{new Date(template.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {template.creator
                        ? `${template.creator.firstName || ''} ${template.creator.lastName || ''}`.trim() ||
                          template.creator.email
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, template)}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {hasPermission('tot_template:view') && (
          <MenuItem onClick={handleView}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
        )}
        {hasPermission('tot_template:edit') && (
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('tot_template:create') && (
          <MenuItem onClick={handleDuplicate}>
            <ContentCopy fontSize="small" sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        )}
        {hasPermission('tot_template:view') && (
          <MenuItem onClick={handleVersionHistory}>
            <History fontSize="small" sx={{ mr: 1 }} />
            Version History
          </MenuItem>
        )}
        {hasPermission('tot_template:delete') && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Modals */}
      <CreateEditTemplateModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {openEditModal && editingTemplate && (
        <CreateEditTemplateModal
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setEditingTemplate(null);
          }}
          onSuccess={handleEditSuccess}
          template={editingTemplate}
        />
      )}

      {openViewModal && viewingTemplateId && (
        <ViewTemplateModal
          open={openViewModal}
          onClose={() => {
            setOpenViewModal(false);
            setViewingTemplateId(null);
          }}
          templateId={viewingTemplateId}
        />
      )}

      {openVersionModal && versionTemplateId && (
        <VersionHistoryModal
          open={openVersionModal}
          onClose={() => {
            setOpenVersionModal(false);
            setVersionTemplateId(null);
          }}
          templateId={versionTemplateId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Archive Template"
        message={`Are you sure you want to archive "${selectedTemplate?.name}"? This action can be undone later.`}
        confirmText="Archive"
        cancelText="Cancel"
        confirmColor="error"
        loading={deleteMutation.isLoading}
      />
    </MainLayout>
  );
}
