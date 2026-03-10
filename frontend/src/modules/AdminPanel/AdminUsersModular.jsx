import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './admin.css';

// Import modular components
import AdminContainer from './components/AdminContainer';
import CompaniesHome from './components/CompaniesHome';
import TenantDetailView from './components/TenantDetailView';

// Import utilities and hooks
import { useAdminData } from './hooks/useAdminData';
import { extractErrorMessage, decodeTokenPayload, formatDateTime, csvEscape, downloadCsv } from './utils/adminUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function AdminUsersModular({ showOnlyCompanies = false }) {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingRejectRequest, setPendingRejectRequest] = useState(null);
  
  // Use the custom hook for all state management
  const {
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
  } = useAdminData();

  // Event handlers - keeping exact same functionality
  function openCompany(companyId) {
    navigate(`/admin/company/${companyId}`);
  }

  function backToCompanies() {
    navigate('/admin');
  }

  function backToLanding() {
    navigate('/');
  }

  function refreshTenantData() {
    if (!currentTenant) return;
    setRefreshNonce((prev) => prev + 1);
    setInfo('Refreshing tenant data...');
  }

  async function copyTenantId() {
    if (!currentTenant) return;
    try {
      await navigator.clipboard.writeText(currentTenant);
      setInfo('Tenant ID copied.');
    } catch {
      setError('Could not copy tenant ID.');
    }
  }

  async function handleRenameCompany() {
    if (!isSuper || !selectedTenant) return;
    const nextName = companyNameDraft.trim();
    if (!nextName) {
      setError('Company name cannot be empty.');
      return;
    }

    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nextName }),
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to rename company'));
      }
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedTenant ? { ...company, name: nextName } : company,
        ),
      );
      setInfo('Company name updated.');
    } catch (err) {
      console.error(err);
      setError('Unable to rename company.');
    }
  }

  async function handleDeleteCompany() {
    if (!isSuper || !selectedTenant) return;
    if (!window.confirm('Delete this company and all its data?')) return;

    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to delete company'));
      }

      const comps = await fetchCompaniesList();
      setCompanies(comps);
      setViewMode('companies');
      if (!comps.some((c) => c.id === selectedTenant)) {
        setSelectedTenant(comps[0]?.id || '');
      }
      setUsers([]);
      setPurchasedConnectorIds(new Set());
      setPurchasedConnectorMeta(new Map());
      setConnectorRequests([]);
      setInfo('Company deleted.');
    } catch (err) {
      console.error(err);
      setError('Unable to delete company.');
    }
  }

  async function handleRemoveAdmin() {
    if (!isSuper || !selectedTenant) return;
    if (!window.confirm('Remove the admin user for this company?')) return;

    setError('');
    setInfo('');
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}/admin`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to remove admin'));
      }

      const listRes = await fetch(`${API_BASE_URL}/admin/${selectedTenant}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        throw new Error(extractErrorMessage(await listRes.text(), 'Failed to refresh users'));
      }
      setUsers(await listRes.json());
      setInfo('Admin removed.');
    } catch (err) {
      console.error(err);
      setError('Unable to remove admin.');
    }
  }

  function toggleMarketplaceSelection(connectorId) {
    if (!canManageConnectors) return;
    setSelectedMarketConns((prev) => {
      const next = new Set(prev);
      if (next.has(connectorId)) next.delete(connectorId);
      else next.add(connectorId);
      return next;
    });
  }

  function togglePurchasedSelection(connectorId) {
    if (!canManageConnectors) return;
    setSelectedPurchasedConns((prev) => {
      const next = new Set(prev);
      if (next.has(connectorId)) next.delete(connectorId);
      else next.add(connectorId);
      return next;
    });
  }

  function selectAllFilteredMarketplace() {
    if (!canManageConnectors) return;
    setSelectedMarketConns((prev) => {
      const next = new Set(prev);
      filteredMarketplaceCatalog.forEach((connector) => next.add(connector.id));
      return next;
    });
  }

  function clearMarketplaceSelection() {
    if (!canManageConnectors) return;
    setSelectedMarketConns(new Set());
  }

  function selectAllFilteredPrebuilt() {
    if (!canManageConnectors) return;
    setSelectedPurchasedConns((prev) => {
      const next = new Set(prev);
      filteredPurchasedCatalog.forEach((connector) => next.add(connector.id));
      return next;
    });
  }

  function clearPrebuiltSelection() {
    if (!canManageConnectors) return;
    setSelectedPurchasedConns(new Set());
  }

  function handleCompanyCreated(tenantId) {
    setSelectedTenant(tenantId);
    setInfo('Company created. Click the company card to open details.');
  }

  function toggleRequestSelection(requestId) {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
  }

  function selectAllPendingRequests() {
    const pendingIds = filteredConnectorRequests
      .filter((request) => request.status === 'PENDING')
      .map((request) => request.id);
    setSelectedRequestIds(new Set(pendingIds));
  }

  function clearSelectedRequests() {
    setSelectedRequestIds(new Set());
  }

  function exportConnectorSnapshot() {
    const rows = [
      ...purchasedCatalog.map((connector) => [
        'Prebuilt',
        connector.id,
        connector.name,
        connector.type,
      ]),
      ...marketplaceCatalog.map((connector) => [
        'Marketplace',
        connector.id,
        connector.name,
        connector.type,
      ]),
    ];
    downloadCsv(
      `tenant-${currentTenant || 'unknown'}-connector-snapshot.csv`,
      ['Section', 'Connector ID', 'Name', 'Type'],
      rows,
    );
    setInfo('Connector snapshot exported.');
  }

  function exportRequestsSnapshot() {
    const rows = connectorRequests.map((request) => [
      request.id,
      request.connector_id,
      request.connector_name,
      request.connector_type,
      request.status,
      request.requested_by_name || request.requested_by_email || '',
      request.request_comment || '',
      request.sla_state || '',
      formatDateTime(request.created_at),
      formatDateTime(request.decided_at),
    ]);
    downloadCsv(
      `tenant-${currentTenant || 'unknown'}-connector-requests.csv`,
      [
        'Request ID',
        'Connector ID',
        'Connector Name',
        'Connector Type',
        'Status',
        'Requester',
        'Comment',
        'SLA',
        'Created At',
        'Decided At',
      ],
      rows,
    );
    setInfo('Connector request report exported.');
  }

  async function processConnectorRequestDecision(request, action, reason = '') {
    if (!isSuper) return;
    if (!request?.id) return;

    setError('');
    setInfo('');
    setRequestBusyId(request.id);
    try {
      const mappedAction =
        action === 'grant'
          ? 'approve'
          : action === 'deny' || action === 'reject'
            ? 'decline'
            : action;
      const payload = { action: mappedAction };
      if (mappedAction === 'decline') {
        payload.reason = (reason || 'Declined by superadmin').trim();
      }

      const res = await fetch(`${API_BASE_URL}/integration/superadmin/requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to process connector request'));
      }

      const updated = await res.json();
      setConnectorRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      if (updated.status === 'GRANTED') {
        setPurchasedConnectorIds((prev) => {
          const next = new Set(prev);
          next.add(updated.connector_id);
          return next;
        });
        setPurchasedConnectorMeta((prev) => {
          const next = new Map(prev);
          next.set(updated.connector_id, {
            name: updated.connector_name || updated.connector_id,
            type: updated.connector_type || 'Unknown',
          });
          return next;
        });
      }
      setInfo(
        action === 'grant'
          ? `Granted request for ${updated.connector_name || updated.connector_id}.`
          : `Declined request for ${updated.connector_name || updated.connector_id}.`,
      );
      setSelectedRequestIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    } catch (err) {
      console.error(err);
      setError('Unable to process connector request.');
    } finally {
      setRequestBusyId('');
    }
  }

  function openRejectModal(request) {
    setPendingRejectRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  }

  function closeRejectModal() {
    setShowRejectModal(false);
    setRejectReason('');
    setPendingRejectRequest(null);
  }

  async function submitRejectModal() {
    const reason = rejectReason.trim();
    if (!reason) {
      setError('Rejection reason is required.');
      return;
    }
    if (!pendingRejectRequest) return;
    await processConnectorRequestDecision(pendingRejectRequest, 'decline', reason);
    closeRejectModal();
  }

  // Initialize data - keeping exact same logic
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!token) {
        setError('Missing token.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const meRes = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          throw new Error(extractErrorMessage(await meRes.text(), 'Failed to load profile'));
        }
        const me = await meRes.json();
        if (cancelled) return;

        const catalog = await fetchConnectorCatalog();
        if (cancelled) return;
        setConnectorCatalog(catalog);

        if (me.superadmin) {
          setIsSuper(true);
          setForbidden(false);
          setViewMode('companies');
          const comps = await fetchCompaniesList();
          if (cancelled) return;
          setCompanies(comps);
          if (comps.length > 0) {
            setSelectedTenant(comps[0].id);
          }
          // load external users for superadmin tracking
          try {
            const usersRes = await fetch(`${API_BASE_URL}/superadmin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (usersRes.ok) {
              const all = await usersRes.json();
              if (!cancelled) {
                setOauthUsers(all.filter((u) => u.auth_provider && u.auth_provider !== 'LOCAL'));
              }
            }
          } catch {
            // ignore failures; this is just a convenience
          }
        } else if (me.role === 'ADMIN') {
          setIsSuper(false);
          setForbidden(false);
          setViewMode('detail');
          const resolvedTenantId =
            effectiveTenantId || me.tenant_id || tenantFromToken || tenantFromStorage || '';
          setSelectedTenant(resolvedTenantId);
          if (resolvedTenantId) {
            setEffectiveTenantId(resolvedTenantId);
            localStorage.setItem('connectx_tenant_id', resolvedTenantId);
          } else {
            setError('Tenant context missing for this admin account. Please sign in again.');
          }
          // For regular admins, fetch their company details
          try {
            console.log('Admin logged in for tenant:', resolvedTenantId);
            if (resolvedTenantId) {
              const companyDetails = await fetchCompanyDetails(resolvedTenantId);
              setAdminCompany(companyDetails);
            }
          } catch (err) {
            console.error('Failed to fetch company details:', err);
            // Don't fail completely, just continue without company details
          }
        } else {
          setForbidden(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Unable to load admin page data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token, effectiveTenantId]);

  // Load tenant data - keeping exact same logic
  useEffect(() => {
    setCompanyNameDraft(selectedCompany?.name || adminCompany?.name || '');
  }, [selectedTenant, selectedCompany?.name, adminCompany?.name]);

  useEffect(() => {
    setSelectedRequestIds((prev) => {
      const next = new Set();
      const validIds = new Set(filteredConnectorRequests.map((request) => request.id));
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredConnectorRequests]);

  // Handle URL parameter - auto-open company if tenantId is in URL
  useEffect(() => {
    if (tenantId && companies.length > 0) {
      const company = companies.find(c => c.id === tenantId);
      if (company) {
        setSelectedTenant(tenantId);
        setViewMode('detail');
        setDetailTab('admin');
        // setConnectorSubTab('connectors');
        setConnectorSearch('');
        setConnectorTypeFilter('ALL');
        setConnectorSort('asc');
        setConnectorDensity('cozy');
        setCatalogSearch('');
        setCatalogTypeFilter('ALL');
        setCatalogSort('asc');
        setNotificationSearch('');
        setNotificationStatusFilter('ALL');
        setNotificationSort('newest');
        setSelectedRequestIds(new Set());
        setError('');
        setInfo('');
        setEditingUser(null);
      } else {
        // Company not found, show error and redirect to companies list
        setError(`Company with tenant ID "${tenantId}" not found.`);
        setViewMode('companies');
      }
    } else if (tenantId && companies.length === 0) {
      // TenantId in URL but companies not loaded yet - show loading
      setInfo('Loading company details...');
    } else if (!tenantId && viewMode === 'detail') {
      // No tenantId in URL but we're in detail mode (browser back button)
      // Reset to companies view
      setViewMode('companies');
      setSelectedTenant('');
      setError('');
      setInfo('');
      setEditingUser(null);
    }
  }, [tenantId, companies, viewMode]);

  // Ensure admin sees their company when companies are loaded
  useEffect(() => {
    if (!isSuper && selectedTenant) {
      // For admins, we don't need to wait for companies list since they don't see it
      // Just ensure they're in the correct detail view
      if (viewMode === 'detail') {
        setDetailTab('admin');
      }
    }
  }, [selectedTenant, isSuper, viewMode]);

  useEffect(() => {
    if (!token || !currentTenant || forbidden) {
      setUsers([]);
      setPurchasedConnectorIds(new Set());
      setPurchasedConnectorMeta(new Map());
      setSelectedMarketConns(new Set());
      setSelectedPurchasedConns(new Set());
      setConnectorRequests([]);
      return;
    }

    let cancelled = false;

    async function loadTenantData() {
      setTenantLoading(true);
      setConnectorLoading(true);
      try {
        const [usersRes, connectorsRes, requestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/${currentTenant}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/admin/${currentTenant}/connector-requests`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!usersRes.ok) {
          throw new Error(extractErrorMessage(await usersRes.text(), 'Failed to load users'));
        }
        if (!connectorsRes.ok) {
          throw new Error(
            extractErrorMessage(await connectorsRes.text(), 'Failed to load connectors'),
          );
        }

        const [usersData, connectorsData, requestsData] = await Promise.all([
          usersRes.json(),
          connectorsRes.json(),
          requestsRes.ok ? requestsRes.json() : Promise.resolve([]),
        ]);
        if (cancelled) return;

        setUsers(usersData);
        const purchasedIds = new Set();
        const purchasedMeta = new Map();
        connectorsData.forEach((connector) => {
          const rawId = (connector.connector_id || connector.name || '').trim();
          if (!rawId) return;
          purchasedIds.add(rawId);
          purchasedMeta.set(rawId, {
            name: connector.name || rawId,
            type: connector.category || connector.type || 'Unknown',
          });
        });

        setPurchasedConnectorIds(purchasedIds);
        setPurchasedConnectorMeta(purchasedMeta);
        setConnectorRequests(
          Array.isArray(requestsData)
            ? requestsData.sort((a, b) => {
                const aTs = new Date(a.created_at || 0).getTime();
                const bTs = new Date(b.created_at || 0).getTime();
                return bTs - aTs;
              })
            : [],
        );
        setSelectedMarketConns(new Set());
        setSelectedPurchasedConns(new Set());
        setSelectedRequestIds(new Set());
        setLastRefreshedAt(new Date().toISOString());
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Unable to load tenant data.');
        }
      } finally {
        if (!cancelled) {
          setTenantLoading(false);
          setConnectorLoading(false);
        }
      }
    }

    loadTenantData();
    return () => {
      cancelled = true;
    };
  }, [token, currentTenant, forbidden, refreshNonce]);

  // Loading state
  if (loading) {
    return <div style={{ padding: 24, color: '#0f172a' }}>Loading admin panel...</div>;
  }

  // Forbidden state
  if (forbidden) {
    return <div style={{ padding: 24, color: '#0f172a' }}>You are not an admin for this tenant.</div>;
  }

  // Main render using modular components
  return (
    <AdminContainer 
      isSuper={isSuper} 
      error={error} 
      info={info} 
      onClearMessages={() => {
        setError('');
        setInfo('');
      }}
    >
      {/* Show only companies list (no tabs) when showOnlyCompanies is true */}
      {showOnlyCompanies && (
        <CompaniesHome
          isSuper={isSuper}
          oauthUsers={oauthUsers}
          showCompanyForm={showCompanyForm}
          companySearch={companySearch}
          filteredCompanies={filteredCompanies}
          companies={companies}
          onBackToLanding={backToLanding}
          onToggleCompanyForm={() => setShowCompanyForm(prev => !prev)}
          onCompanySearch={setCompanySearch}
          onOpenCompany={openCompany}
          setCompanies={setCompanies}
          token={token}
          connectorCatalog={connectorCatalog}
          onCompanyCreated={handleCompanyCreated}
        />
      )}

      {/* Regular Admin - Show TenantDetailView directly */}
      {!showOnlyCompanies && !isSuper && adminCompany && (
        <TenantDetailView
          selectedCompany={adminCompany}
          isSuper={isSuper}
          detailTab={detailTab}
          users={users}
          adminUser={adminUser}
          connectorLoading={connectorLoading}
          tenantLoading={tenantLoading}
          lastRefreshedAt={lastRefreshedAt}
          companyNameDraft={companyNameDraft}
          onBackToCompanies={backToCompanies}
          onBackToLanding={backToLanding}
          onRefreshTenantData={refreshTenantData}
          onCopyTenantId={copyTenantId}
          onDetailTabChange={setDetailTab}
          onCompanyNameDraftChange={setCompanyNameDraft}
          onSaveName={handleRenameCompany}
          onDeleteCompany={handleDeleteCompany}
          onRemoveAdmin={handleRemoveAdmin}
          onUsersUpdate={setUsers}
          onConnectorsUpdate={(updated) => {
            // Update purchased connectors when they change
            const purchasedIds = new Set();
            const purchasedMeta = new Map();
            updated.forEach((connector) => {
              const rawId = (connector.connector_id || connector.name || '').trim();
              if (!rawId) return;
              purchasedIds.add(rawId);
              purchasedMeta.set(rawId, {
                name: connector.name || rawId,
                type: connector.category || connector.type || 'Unknown',
              });
            });
            setPurchasedConnectorIds(purchasedIds);
            setPurchasedConnectorMeta(purchasedMeta);
          }}
          currentTenant={currentTenant}
          // Connector management props
          purchasedCatalog={purchasedCatalog}
          marketplaceCatalog={marketplaceCatalog}
          filteredPurchasedCatalog={filteredPurchasedCatalog}
          filteredMarketplaceCatalog={filteredMarketplaceCatalog}
          selectedMarketConns={selectedMarketConns}
          selectedPurchasedConns={selectedPurchasedConns}
          connectorRequests={connectorRequests}
          filteredConnectorRequests={filteredConnectorRequests}
          connectorBusy={connectorBusy}
          requestBusyId={requestBusyId}
          connectorSubTab={connectorSubTab}
          connectorSearch={connectorSearch}
          connectorTypeFilter={connectorTypeFilter}
          connectorSort={connectorSort}
          connectorDensity={connectorDensity}
          notificationSearch={notificationSearch}
          notificationStatusFilter={setNotificationStatusFilter}
          notificationSort={notificationSort}
          connectorTypeOptions={connectorTypeOptions}
          canManageConnectors={canManageConnectors}
          token={token}
          catalogById={catalogById}
          onConnectorSubTabChange={setConnectorSubTab}
          onConnectorSearchChange={setConnectorSearch}
          onConnectorTypeFilterChange={setConnectorTypeFilter}
          onConnectorSortChange={setConnectorSort}
          onConnectorDensityChange={setConnectorDensity}
          onNotificationSearchChange={setNotificationSearch}
          onNotificationStatusFilterChange={setNotificationStatusFilter}
          onNotificationSortChange={setNotificationSort}
          onToggleMarketplaceSelection={toggleMarketplaceSelection}
          onTogglePurchasedSelection={togglePurchasedSelection}
          onSelectAllFilteredMarketplace={selectAllFilteredMarketplace}
          onSelectAllFilteredPrebuilt={selectAllFilteredPrebuilt}
          onClearMarketplaceSelection={clearMarketplaceSelection}
          onClearPrebuiltSelection={clearPrebuiltSelection}
          onPurchaseSelectedConnectors={async () => {
            if (!canManageConnectors) {
              setError('Only superadmin can manage connectors.');
              return;
            }
            if (!currentTenant || selectedMarketConns.size === 0) return;
            setError('');
            setInfo('');
            setConnectorBusy(true);

            try {
              const ids = Array.from(selectedMarketConns);
              await Promise.all(
                ids.map(async (connectorId) => {
                  const connector = catalogById.get(connectorId);
                  const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      connector_id: connectorId,
                      name: connector?.name || connectorId,
                      category: connector?.type || '',
                      type: 'prebuilt',
                      logo_url: connector?.logoUrl || '',
                      external_url: connector?.url || '',
                    }),
                  });
                  if (!res.ok && res.status !== 409) {
                    throw new Error(extractErrorMessage(await res.text(), 'Failed to purchase connector'));
                  }
                }),
              );

              setPurchasedConnectorIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.add(id));
                return next;
              });
              setSelectedMarketConns(new Set());
              setInfo(`Purchased ${ids.length} connector${ids.length > 1 ? 's' : ''}.`);
            } catch (err) {
              console.error(err);
              setError('Unable to purchase selected connectors.');
            } finally {
              setConnectorBusy(false);
            }
          }}
          onMoveSelectedToMarketplace={async () => {
            if (!canManageConnectors) {
              setError('Only superadmin can manage connectors.');
              return;
            }
            if (!currentTenant || selectedPurchasedConns.size === 0) return;
            setError('');
            setInfo('');
            setConnectorBusy(true);

            try {
              const ids = Array.from(selectedPurchasedConns);
              await Promise.all(
                ids.map(async (connectorId) => {
                  const res = await fetch(
                    `${API_BASE_URL}/admin/${currentTenant}/connectors/${encodeURIComponent(connectorId)}`,
                    {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    },
                  );
                  if (!res.ok && res.status !== 404) {
                    throw new Error(
                      extractErrorMessage(await res.text(), 'Failed to move connector to marketplace'),
                    );
                  }
                }),
              );

              setPurchasedConnectorIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.delete(id));
                return next;
              });
              setPurchasedConnectorMeta((prev) => {
                const next = new Map(prev);
                ids.forEach((id) => next.delete(id));
                return next;
              });
              setSelectedPurchasedConns(new Set());
              setInfo(`Moved ${ids.length} connector${ids.length > 1 ? 's' : ''} to Marketplace.`);
            } catch (err) {
              console.error(err);
              setError('Unable to update purchased connectors.');
            } finally {
              setConnectorBusy(false);
            }
          }}
          onConnectorRequestDecision={async (request, action) => {
            const mappedAction =
              action === 'grant'
                ? 'approve'
                : action === 'deny' || action === 'reject'
                  ? 'decline'
                  : action;
            if (mappedAction === 'decline') {
              openRejectModal(request);
              return;
            }
            await processConnectorRequestDecision(request, mappedAction);
          }}
          onToggleRequestSelection={toggleRequestSelection}
          onSelectAllPendingRequests={selectAllPendingRequests}
          onClearSelectedRequests={clearSelectedRequests}
          onBulkConnectorRequestDecision={async (action) => {
            const pendingSelection = filteredConnectorRequests.filter(
              (request) => request.status === 'PENDING' && selectedRequestIds.has(request.id),
            );
            if (pendingSelection.length === 0) {
              setError('Select at least one pending request.');
              return;
            }

            setError('');
            setInfo('');
            for (const request of pendingSelection) {
              // eslint-disable-next-line no-await-in-loop
              await onConnectorRequestDecision(request, action);
            }
            setSelectedRequestIds(new Set());
            setInfo(
              `${action === 'grant' ? 'Granted' : 'Declined'} ${pendingSelection.length} selected request${
                pendingSelection.length > 1 ? 's' : ''
              }.`,
            );
          }}
          selectedRequestIds={selectedRequestIds}
          onRefreshData={refreshTenantData}
          onMarketplaceUpdate={refreshTenantData}
        />
      )}

      {!showOnlyCompanies && !isSuper && !adminCompany && (
        <div style={{ padding: 24, color: '#0f172a' }}>
          {error || 'Loading your company details...'}
        </div>
      )}

      {/* Superadmin - Show Companies Home */}
      {!showOnlyCompanies && isSuper && viewMode === 'companies' && (
        <CompaniesHome
          isSuper={isSuper}
          oauthUsers={oauthUsers}
          showCompanyForm={showCompanyForm}
          companySearch={companySearch}
          filteredCompanies={filteredCompanies}
          companies={companies}
          onBackToLanding={backToLanding}
          onToggleCompanyForm={() => setShowCompanyForm(prev => !prev)}
          onCompanySearch={setCompanySearch}
          onOpenCompany={openCompany}
          setCompanies={setCompanies}
          token={token}
          connectorCatalog={connectorCatalog}
          onCompanyCreated={handleCompanyCreated}
        />
      )}

      {/* Superadmin or Regular Admin - Show TenantDetailView when in detail mode */}
      {!showOnlyCompanies && viewMode === 'detail' && (selectedCompany || adminCompany) && (
        <TenantDetailView
          selectedCompany={selectedCompany || adminCompany}
          isSuper={isSuper}
          detailTab={detailTab}
          users={users}
          adminUser={adminUser}
          connectorLoading={connectorLoading}
          tenantLoading={tenantLoading}
          lastRefreshedAt={lastRefreshedAt}
          companyNameDraft={companyNameDraft}
          onBackToCompanies={backToCompanies}
          onBackToLanding={backToLanding}
          onRefreshTenantData={refreshTenantData}
          onCopyTenantId={copyTenantId}
          onDetailTabChange={setDetailTab}
          onCompanyNameDraftChange={setCompanyNameDraft}
          onSaveName={handleRenameCompany}
          onDeleteCompany={handleDeleteCompany}
          onRemoveAdmin={handleRemoveAdmin}
          onUsersUpdate={setUsers}
          onConnectorsUpdate={(updated) => {
            // Update purchased connectors when they change
            const purchasedIds = new Set();
            const purchasedMeta = new Map();
            updated.forEach((connector) => {
              const rawId = (connector.connector_id || connector.name || '').trim();
              if (!rawId) return;
              purchasedIds.add(rawId);
              purchasedMeta.set(rawId, {
                name: connector.name || rawId,
                type: connector.category || connector.type || 'Unknown',
              });
            });
            setPurchasedConnectorIds(purchasedIds);
            setPurchasedConnectorMeta(purchasedMeta);
          }}
          currentTenant={currentTenant}
          // Connector management props
          purchasedCatalog={purchasedCatalog}
          marketplaceCatalog={marketplaceCatalog}
          filteredPurchasedCatalog={filteredPurchasedCatalog}
          filteredMarketplaceCatalog={filteredMarketplaceCatalog}
          selectedMarketConns={selectedMarketConns}
          selectedPurchasedConns={selectedPurchasedConns}
          connectorRequests={connectorRequests}
          filteredConnectorRequests={filteredConnectorRequests}
          connectorBusy={connectorBusy}
          requestBusyId={requestBusyId}
          connectorSubTab={connectorSubTab}
          connectorSearch={connectorSearch}
          connectorTypeFilter={connectorTypeFilter}
          connectorSort={connectorSort}
          connectorDensity={connectorDensity}
          notificationSearch={notificationSearch}
          notificationStatusFilter={notificationStatusFilter}
          notificationSort={notificationSort}
          connectorTypeOptions={connectorTypeOptions}
          canManageConnectors={canManageConnectors}
          token={token}
          catalogById={catalogById}
          onConnectorSubTabChange={setConnectorSubTab}
          onConnectorSearchChange={setConnectorSearch}
          onConnectorTypeFilterChange={setConnectorTypeFilter}
          onConnectorSortChange={setConnectorSort}
          onConnectorDensityChange={setConnectorDensity}
          onNotificationSearchChange={setNotificationSearch}
          onNotificationStatusFilterChange={setNotificationStatusFilter}
          onNotificationSortChange={setNotificationSort}
          onToggleMarketplaceSelection={toggleMarketplaceSelection}
          onTogglePurchasedSelection={togglePurchasedSelection}
          onSelectAllFilteredMarketplace={selectAllFilteredMarketplace}
          onSelectAllFilteredPrebuilt={selectAllFilteredPrebuilt}
          onClearMarketplaceSelection={clearMarketplaceSelection}
          onClearPrebuiltSelection={clearPrebuiltSelection}
          onPurchaseSelectedConnectors={async () => {
            if (!canManageConnectors) {
              setError('Only superadmin can manage connectors.');
              return;
            }
            if (!currentTenant || selectedMarketConns.size === 0) return;
            setError('');
            setInfo('');
            setConnectorBusy(true);

            try {
              const ids = Array.from(selectedMarketConns);
              await Promise.all(
                ids.map(async (connectorId) => {
                  const connector = catalogById.get(connectorId);
                  const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      connector_id: connectorId,
                      name: connector?.name || connectorId,
                      category: connector?.type || '',
                      type: 'prebuilt',
                      logo_url: connector?.logoUrl || '',
                      external_url: connector?.url || '',
                    }),
                  });
                  if (!res.ok && res.status !== 409) {
                    throw new Error(extractErrorMessage(await res.text(), 'Failed to purchase connector'));
                  }
                }),
              );

              setPurchasedConnectorIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.add(id));
                return next;
              });
              setSelectedMarketConns(new Set());
              setInfo(`Purchased ${ids.length} connector${ids.length > 1 ? 's' : ''}.`);
            } catch (err) {
              console.error(err);
              setError('Unable to purchase selected connectors.');
            } finally {
              setConnectorBusy(false);
            }
          }}
          onMoveSelectedToMarketplace={async () => {
            if (!canManageConnectors) {
              setError('Only superadmin can manage connectors.');
              return;
            }
            if (!currentTenant || selectedPurchasedConns.size === 0) return;
            setError('');
            setInfo('');
            setConnectorBusy(true);

            try {
              const ids = Array.from(selectedPurchasedConns);
              await Promise.all(
                ids.map(async (connectorId) => {
                  const res = await fetch(
                    `${API_BASE_URL}/admin/${currentTenant}/connectors/${encodeURIComponent(connectorId)}`,
                    {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    },
                  );
                  if (!res.ok && res.status !== 404) {
                    throw new Error(
                      extractErrorMessage(await res.text(), 'Failed to move connector to marketplace'),
                    );
                  }
                }),
              );

              setPurchasedConnectorIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.delete(id));
                return next;
              });
              setPurchasedConnectorMeta((prev) => {
                const next = new Map(prev);
                ids.forEach((id) => next.delete(id));
                return next;
              });
              setSelectedPurchasedConns(new Set());
              setInfo(`Moved ${ids.length} connector${ids.length > 1 ? 's' : ''} to Marketplace.`);
            } catch (err) {
              console.error(err);
              setError('Unable to update purchased connectors.');
            } finally {
              setConnectorBusy(false);
            }
          }}
          onConnectorRequestDecision={async (request, action) => {
            const mappedAction =
              action === 'grant'
                ? 'approve'
                : action === 'deny' || action === 'reject'
                  ? 'decline'
                  : action;
            if (mappedAction === 'decline') {
              openRejectModal(request);
              return;
            }
            await processConnectorRequestDecision(request, mappedAction);
          }}
          onToggleRequestSelection={toggleRequestSelection}
          onSelectAllPendingRequests={selectAllPendingRequests}
          onClearSelectedRequests={clearSelectedRequests}
          onBulkConnectorRequestDecision={async (action) => {
            const pendingSelection = filteredConnectorRequests.filter(
              (request) => request.status === 'PENDING' && selectedRequestIds.has(request.id),
            );
            if (pendingSelection.length === 0) {
              setError('Select at least one pending request.');
              return;
            }

            setError('');
            setInfo('');
            for (const request of pendingSelection) {
              // eslint-disable-next-line no-await-in-loop
              await onConnectorRequestDecision(request, action);
            }
            setSelectedRequestIds(new Set());
            setInfo(
              `${action === 'grant' ? 'Granted' : 'Declined'} ${pendingSelection.length} selected request${
                pendingSelection.length > 1 ? 's' : ''
              }.`,
            );
          }}
          selectedRequestIds={selectedRequestIds}
        />
      )}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={closeRejectModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: 8 }}>Reject connector request</h3>
            <p style={{ margin: 0, marginBottom: 12, color: '#64748b' }}>
              Add a reason visible to the tenant user.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: 10,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button type="button" className="secondary-btn" onClick={closeRejectModal}>
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={submitRejectModal}
                disabled={!rejectReason.trim()}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminContainer>
  );
}
