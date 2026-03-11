import apiClient from '@services/apiClient';

export const connectorsApi = {
  getConnectors: async (params = {}) => {
    const response = await apiClient.get('/connectors', params);
    return response.data;
  },

  getMarketplaceConnectors: async (params = {}) => {
    const response = await apiClient.get('/connectors/marketplace', params);
    return response.data;
  },

  requestConnector: async (connectorData) => {
    const response = await apiClient.post('/connectors/request', connectorData);
    return response.data;
  },

  deployConnector: async (connectorId) => {
    const response = await apiClient.post(`/connectors/${connectorId}/deploy`);
    return response.data;
  },

  updateConnector: async (connectorId, data) => {
    const response = await apiClient.put(`/connectors/${connectorId}`, data);
    return response.data;
  },

  deleteConnector: async (connectorId) => {
    const response = await apiClient.delete(`/connectors/${connectorId}`);
    return response.data;
  },

  getConnectorStats: async () => {
    const response = await apiClient.get('/connectors/stats');
    return response.data;
  },
};
