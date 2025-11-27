import api from './api';

export const adminService = {
  // Tenants
  getTenants: async (status) => {
    const params = status ? { status } : {};
    const response = await api.get('/admin/tenants', { params });
    return response.data;
  },

  getTenant: async (id) => {
    const response = await api.get(`/admin/tenants/${id}`);
    return response.data;
  },

  createTenant: async (data) => {
    const response = await api.post('/admin/tenants', data);
    return response.data;
  },

  updateTenant: async (id, data) => {
    const response = await api.patch(`/admin/tenants/${id}`, data);
    return response.data;
  },

  suspendTenant: async (id) => {
    const response = await api.post(`/admin/tenants/${id}/suspend`);
    return response.data;
  },

  activateTenant: async (id) => {
    const response = await api.post(`/admin/tenants/${id}/activate`);
    return response.data;
  },

  // Roles
  getRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  getRole: async (id) => {
    const response = await api.get(`/admin/roles/${id}`);
    return response.data;
  },

  createRole: async (data) => {
    const response = await api.post('/admin/roles', data);
    return response.data;
  },

  updateRole: async (id, data) => {
    const response = await api.patch(`/admin/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await api.delete(`/admin/roles/${id}`);
    return response.data;
  },

  getRolePermissions: async (roleId) => {
    const response = await api.get(`/admin/roles/${roleId}/permissions`);
    return response.data;
  },

  assignPermissionsToRole: async (roleId, permissionIds) => {
    const response = await api.post(`/admin/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data;
  },

  removePermissionFromRole: async (roleId, permissionId) => {
    const response = await api.delete(
      `/admin/roles/${roleId}/permissions/${permissionId}`
    );
    return response.data;
  },

  // Permissions
  getPermissions: async () => {
    const response = await api.get('/admin/permissions');
    return response.data;
  },

  getPermission: async (slug) => {
    const response = await api.get(`/admin/permissions/${slug}`);
    return response.data;
  },

  createPermission: async (data) => {
    const response = await api.post('/admin/permissions', data);
    return response.data;
  },

  getPermissionsByModule: async (module) => {
    const response = await api.get(`/admin/permissions/module/${module}`);
    return response.data;
  },

  // Users
  searchUsers: async (email) => {
    const response = await api.get('/admin/users/search', { params: { email } });
    return response.data;
  },

  getUsers: async (filters = {}) => {
    const response = await api.get('/admin/users', { params: filters });
    return response.data;
  },

  getTenantUsers: async (tenantId) => {
    const response = await api.get(`/admin/users/tenants/${tenantId}`);
    return response.data;
  },

  assignRoleToUser: async (tenantId, userId, roleId, status = 'active') => {
    const response = await api.post(
      `/admin/users/tenants/${tenantId}/${userId}/roles`,
      { roleId, status }
    );
    return response.data;
  },

  revokeRoleFromUser: async (tenantId, userId, roleId) => {
    const response = await api.delete(
      `/admin/users/tenants/${tenantId}/${userId}/roles/${roleId}`
    );
    return response.data;
  },

  getUserRoles: async (tenantId, userId) => {
    const response = await api.get(
      `/admin/users/tenants/${tenantId}/${userId}/roles`
    );
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (filters = {}) => {
    const response = await api.get('/admin/audit-logs', { params: filters });
    return response.data;
  },

  getTenantAuditLogs: async (tenantId, filters = {}) => {
    const response = await api.get(`/admin/audit-logs/tenants/${tenantId}`, {
      params: filters,
    });
    return response.data;
  },
};

