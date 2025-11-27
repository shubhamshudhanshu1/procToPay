import api from './api';

export const tenantService = {
  /**
   * Get list of tenants user has access to
   * @returns {Promise<{tenants: Array}>}
   */
  getUserTenants: async () => {
    const response = await api.get('/auth/tenants');
    return response.data;
  },

  /**
   * Select tenant context and get full access tokens
   * @param {string|null} tenantId - Tenant ID or null for global admin
   * @returns {Promise<{accessToken: string, refreshToken: string, tenantId: string|null}>}
   */
  selectTenant: async (tenantId) => {
    const response = await api.post('/auth/session/select-tenant', { tenantId });
    return response.data;
  },

  /**
   * Get tenant details
   * @param {string} tenantId
   * @returns {Promise<Object>}
   */
  getTenantDetails: async (tenantId) => {
    const response = await api.get(`/admin/tenants/${tenantId}`);
    return response.data;
  },
};

