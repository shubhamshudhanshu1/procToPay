import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { Search, Add, Edit, Delete, CloudUpload, FileDownload, GetApp } from '@mui/icons-material';
import { masterDataService } from '../services/masterDataService';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/layout/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Snackbar from '../components/ui/Snackbar';
import CustomTabs from '../components/ui/CustomTabs';
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

  // Show error toast for query errors (must be before any conditional returns)
  useEffect(() => {
    if (error && !toast.open) {
      showToast(error.response?.data?.error || 'Failed to load data', 'error');
    }
  }, [error, toast.open, showToast]);

  if (isLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Master Data Management"
        subtitle="Manage brands, categories, and products"
      />

      {/* Custom Tabs */}
      <Box sx={{ mb: 3 }}>
        <CustomTabs
          tabs={[
            { label: 'Brands', value: 0 },
            { label: 'Categories', value: 1 },
            { label: 'Products', value: 2 },
          ]}
          value={tabValue}
          onChange={(newValue) => setTabValue(newValue)}
        />
      </Box>

      {types.map((type, index) => (
        <TabPanel key={type} value={tabValue} index={index}>
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}s Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your {type}s data, add new entries, edit existing ones, or bulk upload.
                </Typography>
              </Box>
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

            {/* Cards List - Full Width Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">
                    No {type}s found. Create your first {type} to get started.
                  </Typography>
                </Box>
              ) : (
                items.map((item) => (
                  <Card
                    key={item.id}
                    sx={{
                      width: '100%',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: '#E0E0E0',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ py: 2, px: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, fontSize: '1rem', color: '#212529' }}
                            >
                              {item.name}
                            </Typography>
                            <Chip
                              label={item.code}
                              size="small"
                              sx={{
                                backgroundColor: '#F5F5F5',
                                color: '#495057',
                                fontWeight: 500,
                                height: 22,
                                fontSize: '0.75rem',
                                borderRadius: '12px',
                                border: 'none',
                              }}
                            />
                          </Box>
                          {type === 'product' ? (
                            <>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                                {item.brand?.code && (
                                  <Chip
                                    label={item.brand.code}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#F5F5F5',
                                      color: '#495057',
                                      height: 20,
                                      fontSize: '0.7rem',
                                      border: 'none',
                                    }}
                                  />
                                )}
                                {item.category?.code && (
                                  <Chip
                                    label={item.category.code}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#F5F5F5',
                                      color: '#495057',
                                      height: 20,
                                      fontSize: '0.7rem',
                                      border: 'none',
                                    }}
                                  />
                                )}
                              </Box>
                              {item.price && (
                                <Typography
                                  variant="h6"
                                  sx={{
                                    mt: 0.5,
                                    color: '#212529',
                                    fontWeight: 600,
                                    fontSize: '1.125rem',
                                  }}
                                >
                                  ₹{parseFloat(item.price).toLocaleString()}
                                </Typography>
                              )}
                            </>
                          ) : (
                            item.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5, color: '#6C757D' }}
                              >
                                {item.description}
                              </Typography>
                            )
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                          {hasPermission('master_data:edit') && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingItem(item);
                                setOpenEditModal(true);
                              }}
                              sx={{
                                border: '1px solid',
                                borderColor: '#E0E0E0',
                                borderRadius: 1,
                                width: 32,
                                height: 32,
                                color: '#495057',
                                '&:hover': {
                                  backgroundColor: '#F5F5F5',
                                },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                          {hasPermission('master_data:delete') && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                setItemToDelete(item);
                                setOpenDeleteConfirm(true);
                              }}
                              sx={{
                                border: '1px solid',
                                borderColor: '#E0E0E0',
                                borderRadius: 1,
                                width: 32,
                                height: 32,
                                color: '#DC3545',
                                '&:hover': {
                                  backgroundColor: '#FFF5F5',
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Box>
        </TabPanel>
      ))}

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
