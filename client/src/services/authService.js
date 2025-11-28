import api from './api';

export const authService = {
  requestOTP: async (contact) => {
    const response = await api.post('/auth/login/request', { contact });
    return response.data;
  },

  resendRegistrationOTP: async (contact) => {
    const response = await api.post('/auth/register/resend', { contact });
    return response.data;
  },

  verifyOTP: async (contact, otp) => {
    const response = await api.post('/auth/login/verify', { contact, otp });
    return response.data;
  },

  verifyRegistrationOTP: async (userId, contact, otp) => {
    const response = await api.post('/auth/register/verify', { userId, contact, otp });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/me');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/me', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};
