import { connectorsEndpoints } from "./endpoints";
import { httpJson } from "./shared/http";

export const connectorsSuperadminApi = {
  getCatalog: (token) => httpJson(connectorsEndpoints.superadminCatalog(), { token }),

  createCatalogEntry: (token, payload) =>
    httpJson(connectorsEndpoints.superadminCatalog(), {
      token,
      method: "POST",
      body: payload,
    }),

  updateCatalogEntry: (connectorId, token, payload) =>
    httpJson(connectorsEndpoints.superadminCatalogById(connectorId), {
      token,
      method: "PATCH",
      body: payload,
    }),

  deleteCatalogEntry: (connectorId, token) =>
    httpJson(connectorsEndpoints.superadminCatalogById(connectorId), {
      token,
      method: "DELETE",
    }),

  listRequests: (token, params = {}) => {
    const search = new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
        return acc;
      }, {}),
    ).toString();
    const path = `${connectorsEndpoints.superadminRequests()}${search ? `?${search}` : ""}`;
    return httpJson(path, { token });
  },

  decideRequest: (requestId, token, payload) =>
    httpJson(connectorsEndpoints.superadminRequestById(requestId), {
      token,
      method: "PATCH",
      body: payload,
    }),

  addRequestNote: (requestId, token, note) =>
    httpJson(connectorsEndpoints.superadminRequestNotes(requestId), {
      token,
      method: "POST",
      body: { note },
    }),

  uploadCatalogAsset: async (token, file, kind = "logo") => {
    const formData = new FormData();
    formData.append("asset", file);
    const query = new URLSearchParams({ kind }).toString();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}${connectorsEndpoints.superadminCatalogAssets()}?${query}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to upload asset");
    }
    return response.json();
  },

  uploadCatalogExcel: async (token, file) => {
    const formData = new FormData();
    formData.append("workbook", file);
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}${connectorsEndpoints.superadminCatalogImportExcel()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to import Excel");
    }
    return response.json();
  },
};

