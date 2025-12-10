import api from './api';

export const totAgreementService = {
  getAgreements: async (params = {}) => {
    const response = await api.get('/tot-agreements', { params });
    return response.data;
  },

  getAgreement: async (id) => {
    const response = await api.get(`/tot-agreements/${id}`);
    return response.data;
  },

  createAgreement: async (data) => {
    const response = await api.post('/tot-agreements', data);
    return response.data;
  },

  updateAgreement: async (id, data) => {
    const response = await api.patch(`/tot-agreements/${id}`, data);
    return response.data;
  },

  deleteAgreement: async (id) => {
    const response = await api.delete(`/tot-agreements/${id}`);
    return response.data;
  },

  approveAgreement: async (id) => {
    const response = await api.post(`/tot-agreements/${id}/approve`, {});
    return response.data;
  },

  rejectAgreement: async (id, reason) => {
    const response = await api.post(`/tot-agreements/${id}/reject`, { reason });
    return response.data;
  },
};

