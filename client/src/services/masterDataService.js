import api from './api';

export const masterDataService = {
  // Brands
  getBrands: async (params = {}) => {
    const response = await api.get('/master-data/brands', { params });
    return response.data;
  },

  getBrand: async (id) => {
    const response = await api.get(`/master-data/brands/${id}`);
    return response.data;
  },

  createBrand: async (data) => {
    const response = await api.post('/master-data/brands', data);
    return response.data;
  },

  updateBrand: async (id, data) => {
    const response = await api.patch(`/master-data/brands/${id}`, data);
    return response.data;
  },

  deleteBrand: async (id) => {
    const response = await api.delete(`/master-data/brands/${id}`);
    return response.data;
  },

  bulkUploadBrands: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/master-data/brands/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportBrands: async () => {
    const response = await api.get('/master-data/brands/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadBrandTemplate: async () => {
    const response = await api.get('/master-data/brands/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Categories
  getCategories: async (params = {}) => {
    const response = await api.get('/master-data/categories', { params });
    return response.data;
  },

  getCategory: async (id) => {
    const response = await api.get(`/master-data/categories/${id}`);
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/master-data/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await api.patch(`/master-data/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/master-data/categories/${id}`);
    return response.data;
  },

  bulkUploadCategories: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/master-data/categories/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportCategories: async () => {
    const response = await api.get('/master-data/categories/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadCategoryTemplate: async () => {
    const response = await api.get('/master-data/categories/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Products
  getProducts: async (params = {}) => {
    const response = await api.get('/master-data/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/master-data/products/${id}`);
    return response.data;
  },

  createProduct: async (data) => {
    const response = await api.post('/master-data/products', data);
    return response.data;
  },

  updateProduct: async (id, data) => {
    const response = await api.patch(`/master-data/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/master-data/products/${id}`);
    return response.data;
  },

  bulkUploadProducts: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/master-data/products/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportProducts: async () => {
    const response = await api.get('/master-data/products/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadProductTemplate: async () => {
    const response = await api.get('/master-data/products/template', {
      responseType: 'blob',
    });
    return response.data;
  },
};

