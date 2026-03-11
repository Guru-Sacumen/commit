export const connectorsEndpoints = {
  tenantPurchased: (tenantId) => `/integration/tenant/${tenantId}/purchased`,
  tenantMarketplace: (tenantId) => `/integration/tenant/${tenantId}/marketplace`,
  tenantStats: (tenantId) => `/integration/tenant/${tenantId}/stats`,
  tenantRequests: (tenantId) => `/integration/tenant/${tenantId}/requests`,
  tenantRequestRespond: (tenantId, requestId) =>
    `/integration/tenant/${tenantId}/requests/${requestId}/respond`,
  tenantDummyRequest: (tenantId) => `/integration/tenant/${tenantId}/dummy-request`,
  tenantDeploymentStatus: (tenantId, connectorId) =>
    `/integration/tenant/${tenantId}/connectors/${connectorId}/deployment-status`,

  categories: () => "/integration/connectors/categories",
  usecases: (connectorId) => `/integration/connectors/${connectorId}/usecases`,
  guide: (connectorId) => `/integration/connectors/${connectorId}/guide`,
  json: (connectorId) => `/integration/connectors/${connectorId}/json`,

  adminConnectors: (tenantId) => `/integration/admin/${tenantId}/connectors`,
  adminConnectorById: (tenantId, connectorId) =>
    `/integration/admin/${tenantId}/connectors/${encodeURIComponent(connectorId)}`,
  adminConnectorRequests: (tenantId) =>
    `/integration/admin/${tenantId}/connector-requests`,

  superadminCatalog: () => "/integration/superadmin/catalog",
  superadminCatalogById: (connectorId) =>
    `/integration/superadmin/catalog/${connectorId}`,
  superadminCatalogAssets: () => "/integration/superadmin/catalog/assets",
  superadminCatalogImportExcel: () => "/integration/superadmin/catalog/import-excel",
  superadminRequests: () => "/integration/superadmin/requests",
  superadminRequestById: (requestId) =>
    `/integration/superadmin/requests/${requestId}`,
  superadminRequestNotes: (requestId) =>
    `/integration/superadmin/requests/${requestId}/notes`,
};

