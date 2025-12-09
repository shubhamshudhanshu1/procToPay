import api from './api';

export const totTemplateService = {
  getTemplates: async (params = {}) => {
    const response = await api.get('/tot-templates', { params });
    return response.data;
  },

  getTemplate: async (id) => {
    const response = await api.get(`/tot-templates/${id}`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await api.post('/tot-templates', data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await api.patch(`/tot-templates/${id}`, data);
    return response.data;
  },

  duplicateTemplate: async (id, data) => {
    const response = await api.post(`/tot-templates/${id}/duplicate`, data);
    return response.data;
  },

  getVersionHistory: async (id) => {
    const response = await api.get(`/tot-templates/${id}/versions`);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await api.delete(`/tot-templates/${id}`);
    return response.data;
  },
};

