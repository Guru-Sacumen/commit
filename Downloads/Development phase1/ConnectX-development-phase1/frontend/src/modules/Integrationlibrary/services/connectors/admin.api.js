import { connectorsEndpoints } from "./endpoints";
import { httpJson } from "./shared/http";

export const connectorsAdminApi = {
  getTenantPurchasedConnectors: (tenantId, token) =>
    httpJson(connectorsEndpoints.tenantPurchased(tenantId), { token }),

  getTenantConnectors: (tenantId, token) =>
    httpJson(connectorsEndpoints.adminConnectors(tenantId), { token }),

  getTenantConnectorRequests: (tenantId, token) =>
    httpJson(connectorsEndpoints.adminConnectorRequests(tenantId), { token }),

  addTenantConnector: (tenantId, token, payload) =>
    httpJson(connectorsEndpoints.adminConnectors(tenantId), {
      token,
      method: "POST",
      body: payload,
    }),

  deleteTenantConnector: (tenantId, connectorId, token) =>
    httpJson(connectorsEndpoints.adminConnectorById(tenantId, connectorId), {
      token,
      method: "DELETE",
    }),

  setConnectorDeploymentStatus: (tenantId, connectorId, token, status) =>
    httpJson(connectorsEndpoints.tenantDeploymentStatus(tenantId, connectorId), {
      token,
      method: "PATCH",
      body: { status },
    }),
};

