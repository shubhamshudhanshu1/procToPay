import { useState, useEffect } from 'react';
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
  InputAdornment,
  Chip,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  FileDownload,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { totAgreementService } from '../services/totAgreementService';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/layout/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Snackbar from '../components/ui/Snackbar';
import MainLayout from '../components/layout/MainLayout';
import CreateEditTotModal from '../components/tot/CreateEditTotModal';
import ViewTotModal from '../components/tot/ViewTotModal';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

export default function TotManagement() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [viewingAgreementId, setViewingAgreementId] = useState(null);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Build query params
  const queryParams = {
    page: 1,
    limit: 20,
    ...(searchFilter && { search: searchFilter }),
    ...(statusFilter && { status: statusFilter }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['totAgreements', queryParams],
    queryFn: () => totAgreementService.getAgreements(queryParams),
  });

  // Show error toast for query errors (must be before any conditional returns)
  useEffect(() => {
    if (error && !toast.open) {
      showToast(error.response?.data?.error || 'Failed to load data', 'error');
    }
  }, [error, toast.open, showToast]);

  const deleteMutation = useMutation({
    mutationFn: (id) => totAgreementService.deleteAgreement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['totAgreements']);
      setOpenDeleteConfirm(false);
      setItemToDelete(null);
      handleMenuClose();
      showToast('Agreement deleted successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.error || 'Failed to delete agreement', 'error');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => totAgreementService.approveAgreement(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['totAgreements']);
      handleMenuClose();
      showToast('Agreement approved successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.error || 'Failed to approve agreement', 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => totAgreementService.rejectAgreement(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['totAgreements']);
      handleMenuClose();
      showToast('Agreement rejected successfully', 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.error || 'Failed to reject agreement', 'error');
    },
  });

  const handleSearch = () => {
    setSearchFilter(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilter('');
  };

  const handleMenuOpen = (event, agreement) => {
    setAnchorEl(event.currentTarget);
    setSelectedAgreement(agreement);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAgreement(null);
  };

  const handleView = () => {
    if (selectedAgreement) {
      setViewingAgreementId(selectedAgreement.id);
      setOpenViewModal(true);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    setEditingAgreement(selectedAgreement);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setItemToDelete(selectedAgreement);
    setOpenDeleteConfirm(true);
    handleMenuClose();
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleApprove = () => {
    if (selectedAgreement) {
      approveMutation.mutate(selectedAgreement.id);
    }
  };

  const handleReject = () => {
    if (selectedAgreement) {
      const reason = prompt('Please provide a reason for rejection:');
      if (reason) {
        rejectMutation.mutate({ id: selectedAgreement.id, reason });
      }
    }
  };

  const handleCreateSuccess = () => {
    setOpenCreateModal(false);
    queryClient.invalidateQueries(['totAgreements']);
  };

  const handleEditSuccess = () => {
    setOpenEditModal(false);
    setEditingAgreement(null);
    queryClient.invalidateQueries(['totAgreements']);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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

  const agreements = data?.agreements || [];
  const agreementCount = agreements.length;

  return (
    <MainLayout>
      <PageHeader
        title="Terms of Trade Management"
        subtitle="Manage all your Terms of Trade agreements"
        showCreateButton={hasPermission('tot_agreement:create')}
        onCreateClick={() => setOpenCreateModal(true)}
        createButtonText="Create New ToT"
      />

      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by name or brand..."
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
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {searchFilter && (
          <Button variant="text" onClick={handleClearSearch} size="small">
            Clear
          </Button>
        )}
      </Box>

      {/* Table */}
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Terms of Trade ({agreementCount})
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Brand</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Categories</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agreements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No agreements found. Create your first agreement to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                agreements.map((agreement) => (
                  <TableRow key={agreement.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {agreement.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{agreement.brand?.name || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip value={agreement.type} size="small" />
                    </TableCell>
                    <TableCell>
                      <StatusChip value={agreement.status} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(agreement.startDate)} to {formatDate(agreement.endDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 300 }}>
                        {agreement.categories && agreement.categories.length > 0 ? (
                          <>
                            {agreement.categories.slice(0, 2).map((category) => (
                              <Chip key={category.id} label={category.name} size="small" />
                            ))}
                            {agreement.categoryCount > 2 && (
                              <Chip
                                label={`+${agreement.categoryCount - 2} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {agreement.status === 'pending_approval' && (
                          <>
                            {hasPermission('tot_agreement:approve') && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedAgreement(agreement);
                                  handleApprove();
                                }}
                                color="success"
                                title="Approve"
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            )}
                            {hasPermission('tot_agreement:reject') && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedAgreement(agreement);
                                  handleReject();
                                }}
                                color="error"
                                title="Reject"
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            )}
                          </>
                        )}
                        {hasPermission('tot_agreement:export') && (
                          <IconButton size="small" title="Download PDF">
                            <FileDownload fontSize="small" />
                          </IconButton>
                        )}
                        {hasPermission('tot_agreement:view') && (
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, agreement)}>
                            <MoreVert fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {hasPermission('tot_agreement:view') && (
          <MenuItem onClick={handleView}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
        )}
        {hasPermission('tot_agreement:edit') && selectedAgreement?.status === 'draft' && (
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('tot_agreement:export') && (
          <MenuItem onClick={handleMenuClose}>
            <FileDownload fontSize="small" sx={{ mr: 1 }} />
            Download PDF
          </MenuItem>
        )}
        {hasPermission('tot_agreement:delete') &&
          ['draft', 'rejected'].includes(selectedAgreement?.status) && (
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          )}
      </Menu>

      {/* Modals */}
      <CreateEditTotModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {openEditModal && editingAgreement && (
        <CreateEditTotModal
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setEditingAgreement(null);
          }}
          onSuccess={handleEditSuccess}
          agreement={editingAgreement}
        />
      )}

      {openViewModal && viewingAgreementId && (
        <ViewTotModal
          open={openViewModal}
          onClose={() => {
            setOpenViewModal(false);
            setViewingAgreementId(null);
          }}
          agreementId={viewingAgreementId}
        />
      )}

      {itemToDelete && (
        <ConfirmationDialog
          open={openDeleteConfirm}
          onClose={() => {
            setOpenDeleteConfirm(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Agreement"
          message={`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="error"
          loading={deleteMutation.isLoading}
        />
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        onClose={hideToast}
        message={toast.message}
        severity={toast.severity}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      />
    </MainLayout>
  );
}
