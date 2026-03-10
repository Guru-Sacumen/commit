import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeTokenPayload, extractErrorMessage, normalizeText, connectorMatchesFilters, sortConnectorsByName } from '../utils/adminUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || '';

export function useAdminData() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [adminCompany, setAdminCompany] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [viewMode, setViewMode] = useState('companies');
  const [detailTab, setDetailTab] = useState('admin');
  const [companyNameDraft, setCompanyNameDraft] = useState('');

  const [isSuper, setIsSuper] = useState(false);
  const [oauthUsers, setOauthUsers] = useState([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('ALL');
  const [catalogSort, setCatalogSort] = useState('asc');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState('');

  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', password: '' });

  const [purchasedConnectorIds, setPurchasedConnectorIds] = useState(new Set());
  const [purchasedConnectorMeta, setPurchasedConnectorMeta] = useState(new Map());
  const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
  const [selectedPurchasedConns, setSelectedPurchasedConns] = useState(new Set());
  const [connectorRequests, setConnectorRequests] = useState([]);
  const [connectorLoading, setConnectorLoading] = useState(false);
  const [connectorBusy, setConnectorBusy] = useState(false);
  const [requestBusyId, setRequestBusyId] = useState('');
  const [connectorCatalog, setConnectorCatalog] = useState([]);
  const [connectorSubTab, setConnectorSubTab] = useState('installed');
  const [connectorSearch, setConnectorSearch] = useState('');
  const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
  const [connectorSort, setConnectorSort] = useState('asc');
  const [connectorDensity, setConnectorDensity] = useState('cozy');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationStatusFilter, setNotificationStatusFilter] = useState('ALL');
  const [notificationSort, setNotificationSort] = useState('newest');
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());

  const token = localStorage.getItem('connectx_token');
  const tenantFromStorage = localStorage.getItem('connectx_tenant_id') || '';
  const decodedToken = decodeTokenPayload(token);
  const tenantFromToken = decodedToken?.tenant_id || decodedToken?.tid || '';
  const [effectiveTenantId, setEffectiveTenantId] = useState(
    tenantFromToken || tenantFromStorage || TENANT_ID,
  );
  const selectedCompany = companies.find((c) => c.id === selectedTenant) || null;
  const currentTenant = isSuper
    ? viewMode === 'detail'
      ? selectedTenant
      : ''
    : effectiveTenantId;

  useEffect(() => {
    const nextTenantId = tenantFromToken || tenantFromStorage || TENANT_ID;
    if (nextTenantId && nextTenantId !== effectiveTenantId) {
      setEffectiveTenantId(nextTenantId);
    }
  }, [tenantFromToken, tenantFromStorage, effectiveTenantId]);

  const catalogById = useMemo(
    () => new Map(connectorCatalog.map((connector) => [connector.id, connector])),
    [connectorCatalog || []],
  );
  const purchasedCatalog = useMemo(
    () =>
      Array.from(purchasedConnectorIds).map((connectorId) => {
        const fromCatalog = catalogById.get(connectorId);
        if (fromCatalog) return fromCatalog;
        const fallback = purchasedConnectorMeta.get(connectorId);
        return {
          id: connectorId,
          name: fallback?.name || connectorId,
          type: fallback?.type || 'Unknown',
        };
      }),
    [catalogById, purchasedConnectorIds, purchasedConnectorMeta],
  );
  const marketplaceCatalog = useMemo(
    () => (connectorCatalog || []).filter((connector) => !purchasedConnectorIds.has(connector.id)),
    [connectorCatalog, purchasedConnectorIds],
  );
  const filteredCompanies = useMemo(() => {
    const query = normalizeText(companySearch);
    if (!query) return companies;
    return companies.filter((company) => {
      const haystack = `${company.name || ''} ${company.id || ''}`;
      return normalizeText(haystack).includes(query);
    });
  }, [companies, companySearch]);
  const catalogTypeOptions = useMemo(() => {
    const options = new Set((connectorCatalog || []).map((connector) => connector.type || 'Unknown'));
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredCatalog = useMemo(
    () =>
      sortConnectorsByName(
        (connectorCatalog || []).filter((connector) =>
          connectorMatchesFilters(connector, catalogSearch, catalogTypeFilter),
        ),
        catalogSort,
      ),
    [connectorCatalog, catalogSearch, catalogTypeFilter, catalogSort],
  );
  const connectorTypeOptions = useMemo(() => {
    const options = new Set((connectorCatalog || []).map((connector) => connector.type || 'Unknown'));
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredPurchasedCatalog = useMemo(
    () =>
      sortConnectorsByName(
        (purchasedCatalog || []).filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [purchasedCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const filteredMarketplaceCatalog = useMemo(
    () =>
      sortConnectorsByName(
        (marketplaceCatalog || []).filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [marketplaceCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const pendingConnectorRequests = useMemo(
    () => (connectorRequests || []).filter((request) => request.status === 'PENDING'),
    [connectorRequests],
  );
  const filteredConnectorRequests = useMemo(() => {
    const query = normalizeText(notificationSearch);
    const filtered = (connectorRequests || []).filter((request) => {
      const statusMatches =
        notificationStatusFilter === 'ALL' || request.status === notificationStatusFilter;
      if (!statusMatches) return false;
      if (!query) return true;
      const requestText = [
        request.connector_name,
        request.connector_id,
        request.connector_type,
        request.requested_by_name,
        request.requested_by_email,
        request.request_comment,
        request.status,
      ]
        .filter(Boolean)
        .join(' ');
      return normalizeText(requestText).includes(query);
    });

    if (notificationSort === 'oldest') {
      return filtered.sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      );
    }
    if (notificationSort === 'sla') {
      return filtered.sort((a, b) => {
        const aPriority =
          a.sla_state === 'BREACHED' ? 0 : a.sla_state === 'AT_RISK' ? 1 : a.sla_state === 'ON_TRACK' ? 2 : 3;
        const bPriority =
          b.sla_state === 'BREACHED' ? 0 : b.sla_state === 'AT_RISK' ? 1 : b.sla_state === 'ON_TRACK' ? 2 : 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    }
    return filtered.sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
  }, [connectorRequests, notificationSearch, notificationStatusFilter, notificationSort]);
  const adminUser = users.find((u) => u.role === 'ADMIN') || null;
  const canManageConnectors = isSuper;

  async function fetchCompaniesList() {
    const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(extractErrorMessage(await res.text(), 'Failed to load companies'));
    }
    return await res.json();
  }

  async function fetchConnectorCatalog() {
    const res = await fetch(`${API_BASE_URL}/connectors/catalog`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(extractErrorMessage(await res.text(), 'Failed to load connector catalog'));
    }
    const rows = await res.json();
    return rows.map((row) => ({
      id: row.connector_id,
      name: row.name,
      type: row.type || 'Unknown',
    }));
  }

  async function fetchCompanyDetails(tenantId) {
    const res = await fetch(`${API_BASE_URL}/admin/${tenantId}/company`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(extractErrorMessage(errorText, 'Failed to load company details'));
    }
    return await res.json();
  }

  return {
    // State
    users, setUsers,
    companies, setCompanies,
    adminCompany, setAdminCompany,
    selectedTenant, setSelectedTenant,
    viewMode, setViewMode,
    detailTab, setDetailTab,
    companyNameDraft, setCompanyNameDraft,
    isSuper, setIsSuper,
    oauthUsers, setOauthUsers,
    showCompanyForm, setShowCompanyForm,
    loading, setLoading,
    tenantLoading, setTenantLoading,
    error, setError,
    info, setInfo,
    forbidden, setForbidden,
    companySearch, setCompanySearch,
    catalogSearch, setCatalogSearch,
    catalogTypeFilter, setCatalogTypeFilter,
    catalogSort, setCatalogSort,
    refreshNonce, setRefreshNonce,
    lastRefreshedAt, setLastRefreshedAt,
    form, setForm,
    editingUser, setEditingUser,
    editForm, setEditForm,
    purchasedConnectorIds, setPurchasedConnectorIds,
    purchasedConnectorMeta, setPurchasedConnectorMeta,
    selectedMarketConns, setSelectedMarketConns,
    selectedPurchasedConns, setSelectedPurchasedConns,
    connectorRequests, setConnectorRequests,
    connectorLoading, setConnectorLoading,
    connectorBusy, setConnectorBusy,
    requestBusyId, setRequestBusyId,
    connectorCatalog, setConnectorCatalog,
    connectorSubTab, setConnectorSubTab,
    connectorSearch, setConnectorSearch,
    connectorTypeFilter, setConnectorTypeFilter,
    connectorSort, setConnectorSort,
    connectorDensity, setConnectorDensity,
    notificationSearch, setNotificationSearch,
    notificationStatusFilter, setNotificationStatusFilter,
    notificationSort, setNotificationSort,
    selectedRequestIds, setSelectedRequestIds,
    
    // Computed values
    token,
    tenantFromStorage,
    tenantFromToken,
    effectiveTenantId,
    setEffectiveTenantId,
    selectedCompany,
    currentTenant,
    catalogById,
    purchasedCatalog,
    marketplaceCatalog,
    filteredCompanies,
    catalogTypeOptions,
    filteredCatalog,
    connectorTypeOptions,
    filteredPurchasedCatalog,
    filteredMarketplaceCatalog,
    pendingConnectorRequests,
    filteredConnectorRequests,
    adminUser,
    canManageConnectors,
    
    // Functions
    fetchCompaniesList,
    fetchConnectorCatalog,
    fetchCompanyDetails,
  };
}
