import apiClient from "@services/apiClient";
import { connectorsEndpoints } from "./endpoints";

export const connectorsUserApi = {
  getPurchasedConnectors: async (tenantId) => {
    const response = await apiClient.get(connectorsEndpoints.tenantPurchased(tenantId));
    return response.data;
  },

  getMarketplaceConnectors: async (tenantId, params = {}) => {
    const response = await apiClient.get(connectorsEndpoints.tenantMarketplace(tenantId), params);
    return response.data;
  },

  getConnectorStats: async (tenantId) => {
    const response = await apiClient.get(connectorsEndpoints.tenantStats(tenantId));
    return response.data;
  },

  getConnectorCategories: async () => {
    const response = await apiClient.get(connectorsEndpoints.categories());
    return response.data;
  },

  getConnectorUsecases: async (connectorId) => {
    const response = await apiClient.get(connectorsEndpoints.usecases(connectorId));
    return response.data;
  },

  getConnectorGuide: async (connectorId) => {
    const response = await apiClient.get(connectorsEndpoints.guide(connectorId));
    return response.data;
  },

  getConnectorJson: async (connectorId) => {
    const response = await apiClient.get(connectorsEndpoints.json(connectorId));
    return response.data;
  },

  requestConnector: async (tenantId, payload) => {
    const response = await apiClient.post(connectorsEndpoints.tenantRequests(tenantId), payload);
    return response.data;
  },

  submitDummyRequest: async (tenantId, payload) => {
    const response = await apiClient.post(connectorsEndpoints.tenantDummyRequest(tenantId), payload);
    return response.data;
  },

  getTenantRequests: async (tenantId) => {
    const response = await apiClient.get(connectorsEndpoints.tenantRequests(tenantId));
    return response.data;
  },

  respondToClarification: async (tenantId, requestId, clarificationResponse) => {
    const response = await apiClient.post(
      connectorsEndpoints.tenantRequestRespond(tenantId, requestId),
      { clarification_response: clarificationResponse },
    );
    return response.data;
  },

  setDeploymentStatus: async (tenantId, connectorId, status) => {
    const response = await apiClient.patch(
      connectorsEndpoints.tenantDeploymentStatus(tenantId, connectorId),
      { status },
    );
    return response.data;
  },
};

