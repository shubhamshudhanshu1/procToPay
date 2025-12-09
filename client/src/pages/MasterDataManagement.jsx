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
  Alert,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  CloudUpload,
  FileDownload,
  GetApp,
} from '@mui/icons-material';
import { masterDataService } from '../services/masterDataService';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/layout/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Snackbar from '../components/ui/Snackbar';
import MainLayout from '../components/layout/MainLayout';
import CreateEditModal from '../components/masterData/CreateEditModal';
import BulkUploadDialog from '../components/masterData/BulkUploadDialog';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const TabPanel = ({ children, value, index }) => {
  return <div hidden={value !== index}>{value === index && children}</div>;
};

export default function MasterDataManagement() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openBulkUpload, setOpenBulkUpload] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Store item to delete separately
  const [editingItem, setEditingItem] = useState(null);

  const types = ['brand', 'category', 'product'];
  const currentType = types[tabValue];

  // Fetch brands and categories for product form
  const { data: brandsData } = useQuery({
    queryKey: ['brands', { limit: 1000 }],
    queryFn: () => masterDataService.getBrands({ limit: 1000 }),
    enabled: currentType === 'product',
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { limit: 1000 }],
    queryFn: () => masterDataService.getCategories({ limit: 1000 }),
    enabled: currentType === 'product',
  });

  const brands = brandsData?.brands || [];
  const categories = categoriesData?.categories || [];

  // Build query params
  const queryParams = {
    limit: 100,
    ...(searchFilter && { search: searchFilter }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [currentType + 's', queryParams],
    queryFn: async () => {
      let result;
      if (currentType === 'brand') result = await masterDataService.getBrands(queryParams);
      else if (currentType === 'category')
        result = await masterDataService.getCategories(queryParams);
      else result = await masterDataService.getProducts(queryParams);
      return result;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (currentType === 'brand') return masterDataService.createBrand(data);
      if (currentType === 'category') return masterDataService.createCategory(data);
      return masterDataService.createProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries([currentType + 's']);
      setOpenCreateModal(false);
    },
    onError: (error) => {
      showToast(error.response?.data?.error || `Failed to create ${currentType}`, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (currentType === 'brand') return masterDataService.updateBrand(id, data);
      if (currentType === 'category') return masterDataService.updateCategory(id, data);
      return masterDataService.updateProduct(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries([currentType + 's']);
      setOpenEditModal(false);
      setEditingItem(null);
    },
    onError: (error) => {
      showToast(error.response?.data?.error || `Failed to update ${currentType}`, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (currentType === 'brand') return masterDataService.deleteBrand(id);
      if (currentType === 'category') return masterDataService.deleteCategory(id);
      return masterDataService.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries([currentType + 's']);
      setOpenDeleteConfirm(false);
      setItemToDelete(null);
      handleMenuClose();
    },
    onError: (error) => {
      showToast(error.response?.data?.error || `Failed to delete ${currentType}`, 'error');
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: (file) => {
      if (currentType === 'brand') return masterDataService.bulkUploadBrands(file);
      if (currentType === 'category') return masterDataService.bulkUploadCategories(file);
      return masterDataService.bulkUploadProducts(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries([currentType + 's']);
    },
  });

  const handleSearch = () => {
    setSearchFilter(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilter('');
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    setEditingItem(selectedItem);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    // Store the item to delete before closing the menu
    setItemToDelete(selectedItem);
    setOpenDeleteConfirm(true);
    handleMenuClose();
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleCreateSuccess = (data) => {
    createMutation.mutate(data);
  };

  const handleEditSuccess = (data) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    }
  };

  const handleBulkUploadSuccess = async (file) => {
    return bulkUploadMutation.mutateAsync(file);
  };

  const handleExport = async () => {
    try {
      let blob;
      if (currentType === 'brand') blob = await masterDataService.exportBrands();
      else if (currentType === 'category') blob = await masterDataService.exportCategories();
      else blob = await masterDataService.exportProducts();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentType}s.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to export data', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      let blob;
      if (currentType === 'brand') blob = await masterDataService.downloadBrandTemplate();
      else if (currentType === 'category')
        blob = await masterDataService.downloadCategoryTemplate();
      else blob = await masterDataService.downloadProductTemplate();

      // Check if blob is valid
      if (!blob) {
        throw new Error('No template data received from server');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentType}s_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return blob; // Return the blob so BulkUploadDialog can use it
    } catch (error) {
      console.error('Template download error:', error);
      throw error; // Re-throw so BulkUploadDialog can handle it
    }
  };

  // Map currentType to the correct API response key
  const dataKeyMap = {
    brand: 'brands',
    category: 'categories',
    product: 'products',
  };
  const items = data?.[dataKeyMap[currentType]] || [];
  const itemCount = items.length;

  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  // Show error toast for query errors
  useEffect(() => {
    if (error && !toast.open) {
      showToast(error.response?.data?.error || 'Failed to load data', 'error');
    }
  }, [error, toast.open, showToast]);

  return (
    <MainLayout>
      <PageHeader
        title="Master Data Management"
        subtitle="Manage brands, categories, and products"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Brands" />
          <Tab label="Categories" />
          <Tab label="Products" />
        </Tabs>
      </Box>

      {types.map((type, index) => (
        <TabPanel key={type} value={tabValue} index={index}>
          <Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}s Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasPermission('master_data:bulk_upload') && (
                  <Button
                    variant="outlined"
                    startIcon={<GetApp />}
                    onClick={handleDownloadTemplate}
                    size="small"
                  >
                    Download Template
                  </Button>
                )}
                {hasPermission('master_data:export') && (
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    onClick={handleExport}
                    size="small"
                  >
                    Export
                  </Button>
                )}
                {hasPermission('master_data:bulk_upload') && (
                  <Button
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    onClick={() => setOpenBulkUpload(true)}
                    size="small"
                  >
                    Import
                  </Button>
                )}
                {hasPermission('master_data:create') && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenCreateModal(true)}
                    size="small"
                  >
                    Add {type}
                  </Button>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                placeholder={`Search ${type}s...`}
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
              {searchFilter && (
                <Button variant="text" onClick={handleClearSearch} size="small">
                  Clear
                </Button>
              )}
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}s ({itemCount})
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Code</TableCell>
                      {type === 'product' ? (
                        <>
                          <TableCell>Brand</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Price</TableCell>
                        </>
                      ) : (
                        <TableCell>Description</TableCell>
                      )}
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={type === 'product' ? 7 : 5}
                          align="center"
                          sx={{ py: 4 }}
                        >
                          <Typography color="text.secondary">
                            No {type}s found. Create your first {type} to get started.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={item.code} size="small" variant="outlined" />
                          </TableCell>
                          {type === 'product' ? (
                            <>
                              <TableCell>
                                <Chip label={item.brand?.code || '-'} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip label={item.category?.code || '-'} size="small" />
                              </TableCell>
                              <TableCell>
                                {item.price ? `₹${parseFloat(item.price).toLocaleString()}` : '-'}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {item.description || '-'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <StatusChip value={item.status} size="small" />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, item)}>
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
          </Box>
        </TabPanel>
      ))}

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {hasPermission('master_data:edit') && (
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('master_data:delete') && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Modals */}
      <CreateEditModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onSuccess={handleCreateSuccess}
        type={currentType}
        brands={brands}
        categories={categories}
      />

      {openEditModal && editingItem && (
        <CreateEditModal
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setEditingItem(null);
          }}
          onSuccess={handleEditSuccess}
          type={currentType}
          data={editingItem}
          brands={brands}
          categories={categories}
        />
      )}

      <BulkUploadDialog
        open={openBulkUpload}
        onClose={() => setOpenBulkUpload(false)}
        onSuccess={handleBulkUploadSuccess}
        type={currentType}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {itemToDelete && (
        <ConfirmationDialog
          open={openDeleteConfirm}
          onClose={() => {
            setOpenDeleteConfirm(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title={`Archive ${currentType.charAt(0).toUpperCase() + currentType.slice(1)}`}
          message={`Are you sure you want to archive "${itemToDelete.name}"? This action will set the ${currentType} status to 'archived'.`}
          confirmText="Archive"
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
