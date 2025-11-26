import api from './api';

/**
 * Configuration Service
 * Fetches public application configuration from the backend
 */
export const configService = {
  /**
   * Get application configuration
   * @returns {Promise<{otp: {length: number}}>}
   */
  getConfig: async () => {
    const response = await api.get('/config');
    return response.data.config;
  },

  /**
   * Get OTP configuration
   * @returns {Promise<{length: number}>}
   */
  getOTPConfig: async () => {
    const config = await configService.getConfig();
    return config.otp;
  },
};

export default configService;
