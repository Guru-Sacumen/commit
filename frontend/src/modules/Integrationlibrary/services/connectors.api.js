import apiClient from '@services/apiClient';

export const connectorsApi = {
  getPurchasedConnectors: async (tenantId) => {
    const response = await apiClient.get(`/integration/tenant/${tenantId}/connectors/purchased`);
    return response.data;
  },

  getMarketplaceConnectors: async (tenantId, params = {}) => {
    const response = await apiClient.get(`/integration/tenant/${tenantId}/marketplace`, params);
    return response.data;
  },

  getConnectorStats: async (tenantId) => {
    const response = await apiClient.get(`/integration/tenant/${tenantId}/stats`);
    return response.data;
  },

  getConnectorCategories: async () => {
    const response = await apiClient.get('/integration/connectors/categories');
    return response.data;
  },

  getConnectorUsecases: async (connectorId) => {
    const response = await apiClient.get(`/integration/connectors/${connectorId}/usecases`);
    return response.data;
  },

  getConnectorGuide: async (connectorId) => {
    const response = await apiClient.get(`/integration/connectors/${connectorId}/guide`);
    return response.data;
  },

  getConnectorJson: async (connectorId) => {
    const response = await apiClient.get(`/integration/connectors/${connectorId}/json`);
    return response.data;
  },

  requestConnector: async (tenantId, payload) => {
    const response = await apiClient.post(`/integration/tenant/${tenantId}/requests`, payload);
    return response.data;
  },

  submitDummyRequest: async (tenantId, payload) => {
    const response = await apiClient.post(`/integration/tenant/${tenantId}/dummy-request`, payload);
    return response.data;
  },

  getTenantRequests: async (tenantId) => {
    const response = await apiClient.get(`/integration/tenant/${tenantId}/requests`);
    return response.data;
  },

  respondToClarification: async (tenantId, requestId, clarificationResponse) => {
    const response = await apiClient.post(
      `/integration/tenant/${tenantId}/requests/${requestId}/respond`,
      { clarification_response: clarificationResponse },
    );
    return response.data;
  },

  setDeploymentStatus: async (tenantId, connectorId, status) => {
    const response = await apiClient.patch(
      `/integration/tenant/${tenantId}/connectors/${connectorId}/deployment-status`,
      { status },
    );
    return response.data;
  },

  getSuperadminRequests: async (params = {}) => {
    const response = await apiClient.get('/integration/superadmin/requests', params);
    return response.data;
  },

  decideRequest: async (requestId, payload) => {
    const response = await apiClient.patch(`/integration/superadmin/requests/${requestId}`, payload);
    return response.data;
  },

  addSuperadminNote: async (requestId, note) => {
    const response = await apiClient.post(`/integration/superadmin/requests/${requestId}/notes`, { note });
    return response.data;
  },
};
