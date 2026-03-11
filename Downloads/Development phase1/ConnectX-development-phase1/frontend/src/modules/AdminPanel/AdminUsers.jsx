// import React, { useEffect, useMemo, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import '/admin.css';
// import CommonSnackbar from '../../common/components/CommonSnackbar';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
// const TENANT_ID = import.meta.env.VITE_TENANT_ID || '';

// function extractErrorMessage(raw, fallback) {
//   if (!raw) return fallback;
//   try {
//     const parsed = JSON.parse(raw);
//     return parsed.detail || fallback;
//   } catch {
//     return raw || fallback;
//   }
// }

// function decodeTokenPayload(token) {
//   try {
//     const payload = token?.split('.')?.[1];
//     if (!payload) return null;
//     const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
//     const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
//     return JSON.parse(atob(padded));
//   } catch {
//     return null;
//   }
// }

// function normalizeText(value = '') {
//   return String(value).toLowerCase().trim();
// }

// function connectorMatchesFilters(connector, query, typeFilter) {
//   const normalizedQuery = normalizeText(query);
//   const normalizedTypeFilter = normalizeText(typeFilter);
//   const byType =
//     normalizedTypeFilter === 'all' || normalizeText(connector.type) === normalizedTypeFilter;
//   if (!byType) return false;
//   if (!normalizedQuery) return true;

//   return (
//     normalizeText(connector.name).includes(normalizedQuery) ||
//     normalizeText(connector.type).includes(normalizedQuery) ||
//     normalizeText(connector.id).includes(normalizedQuery)
//   );
// }

// function sortConnectorsByName(items, sortOrder) {
//   const direction = sortOrder === 'desc' ? -1 : 1;
//   return [...items].sort((a, b) => {
//     const aName = String(a.name || '');
//     const bName = String(b.name || '');
//     return aName.localeCompare(bName) * direction;
//   });
// }

// function formatDateTime(value) {
//   if (!value) return '-';
//   try {
//     return new Date(value).toLocaleString();
//   } catch {
//     return '-';
//   }
// }

// function csvEscape(value) {
//   const safe = String(value ?? '');
//   if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
//     return `"${safe.replace(/"/g, '""')}"`;
//   }
//   return safe;
// }

// function downloadCsv(filename, headers, rows) {
//   const csvLines = [
//     headers.map(csvEscape).join(','),
//     ...rows.map((row) => row.map(csvEscape).join(',')),
//   ];
//   const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
//   const url = URL.createObjectURL(blob);
//   const link = document.createElement('a');
//   link.href = url;
//   link.setAttribute('download', filename);
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }

// export default function AdminUsers() {
//   const navigate = useNavigate();
//   const [users, setUsers] = useState([]);
//   const [companies, setCompanies] = useState([]);
//   const [selectedTenant, setSelectedTenant] = useState('');
//   const [viewMode, setViewMode] = useState('companies');
//   const [detailTab, setDetailTab] = useState('admin');
//   const [companyNameDraft, setCompanyNameDraft] = useState('');

//   const [isSuper, setIsSuper] = useState(false);
//   const [oauthUsers, setOauthUsers] = useState([]);
//   const [showCompanyForm, setShowCompanyForm] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [tenantLoading, setTenantLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [info, setInfo] = useState('');
//   const [forbidden, setForbidden] = useState(false);
//   const [companySearch, setCompanySearch] = useState('');
//   const [catalogSearch, setCatalogSearch] = useState('');
//   const [catalogTypeFilter, setCatalogTypeFilter] = useState('ALL');
//   const [catalogSort, setCatalogSort] = useState('asc');
//   const [refreshNonce, setRefreshNonce] = useState(0);
//   const [lastRefreshedAt, setLastRefreshedAt] = useState('');

//   const [form, setForm] = useState({
//     email: '',
//     fullName: '',
//     password: '',
//   });
//   const [editingUser, setEditingUser] = useState(null);
//   const [editForm, setEditForm] = useState({ fullName: '', password: '' });

//   const [purchasedConnectorIds, setPurchasedConnectorIds] = useState(new Set());
//   const [purchasedConnectorMeta, setPurchasedConnectorMeta] = useState(new Map());
//   const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
//   const [selectedPurchasedConns, setSelectedPurchasedConns] = useState(new Set());
//   const [connectorRequests, setConnectorRequests] = useState([]);
//   const [connectorLoading, setConnectorLoading] = useState(false);
//   const [connectorBusy, setConnectorBusy] = useState(false);
//   const [requestBusyId, setRequestBusyId] = useState('');
//   const [connectorCatalog, setConnectorCatalog] = useState([]);
//   const [connectorSubTab, setConnectorSubTab] = useState('connectors');
//   const [connectorSearch, setConnectorSearch] = useState('');
//   const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
//   const [connectorSort, setConnectorSort] = useState('asc');
//   const [connectorDensity, setConnectorDensity] = useState('cozy');
//   const [notificationSearch, setNotificationSearch] = useState('');
//   const [notificationStatusFilter, setNotificationStatusFilter] = useState('ALL');
//   const [notificationSort, setNotificationSort] = useState('newest');
//   const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
//   const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

//   const token = localStorage.getItem('connectx_token');
//   const tenantFromStorage = localStorage.getItem('connectx_tenant_id') || '';
//   const tenantFromToken = decodeTokenPayload(token)?.tenant_id || '';
//   const effectiveTenantId = tenantFromToken || tenantFromStorage || TENANT_ID;
//   const selectedCompany = companies.find((c) => c.id === selectedTenant) || null;
//   const currentTenant = isSuper
//     ? viewMode === 'detail'
//       ? selectedTenant
//       : ''
//     : effectiveTenantId;

//   const catalogById = useMemo(
//     () => new Map(connectorCatalog.map((connector) => [connector.id, connector])),
//     [connectorCatalog],
//   );
//   const purchasedCatalog = useMemo(
//     () =>
//       Array.from(purchasedConnectorIds).map((connectorId) => {
//         const fromCatalog = catalogById.get(connectorId);
//         if (fromCatalog) return fromCatalog;
//         const fallback = purchasedConnectorMeta.get(connectorId);
//         return {
//           id: connectorId,
//           name: fallback?.name || connectorId,
//           type: fallback?.type || 'Unknown',
//         };
//       }),
//     [catalogById, purchasedConnectorIds, purchasedConnectorMeta],
//   );
//   const marketplaceCatalog = useMemo(
//     () => connectorCatalog.filter((connector) => !purchasedConnectorIds.has(connector.id)),
//     [connectorCatalog, purchasedConnectorIds],
//   );
//   const filteredCompanies = useMemo(() => {
//     const query = normalizeText(companySearch);
//     if (!query) return companies;
//     return companies.filter((company) => {
//       const haystack = `${company.name || ''} ${company.id || ''}`;
//       return normalizeText(haystack).includes(query);
//     });
//   }, [companies, companySearch]);
//   const catalogTypeOptions = useMemo(() => {
//     const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
//     return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
//   }, [connectorCatalog]);
//   const filteredCatalog = useMemo(
//     () =>
//       sortConnectorsByName(
//         connectorCatalog.filter((connector) =>
//           connectorMatchesFilters(connector, catalogSearch, catalogTypeFilter),
//         ),
//         catalogSort,
//       ),
//     [connectorCatalog, catalogSearch, catalogTypeFilter, catalogSort],
//   );
//   const connectorTypeOptions = useMemo(() => {
//     const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
//     return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
//   }, [connectorCatalog]);
//   const filteredPurchasedCatalog = useMemo(
//     () =>
//       sortConnectorsByName(
//         purchasedCatalog.filter((connector) =>
//           connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
//         ),
//         connectorSort,
//       ),
//     [purchasedCatalog, connectorSearch, connectorTypeFilter, connectorSort],
//   );
//   const filteredMarketplaceCatalog = useMemo(
//     () =>
//       sortConnectorsByName(
//         marketplaceCatalog.filter((connector) =>
//           connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
//         ),
//         connectorSort,
//       ),
//     [marketplaceCatalog, connectorSearch, connectorTypeFilter, connectorSort],
//   );
//   const pendingConnectorRequests = useMemo(
//     () => connectorRequests.filter((request) => request.status === 'PENDING'),
//     [connectorRequests],
//   );
//   const filteredConnectorRequests = useMemo(() => {
//     const query = normalizeText(notificationSearch);
//     const filtered = connectorRequests.filter((request) => {
//       const statusMatches =
//         notificationStatusFilter === 'ALL' || request.status === notificationStatusFilter;
//       if (!statusMatches) return false;
//       if (!query) return true;
//       const requestText = [
//         request.connector_name,
//         request.connector_id,
//         request.connector_type,
//         request.requested_by_name,
//         request.requested_by_email,
//         request.request_comment,
//         request.status,
//       ]
//         .filter(Boolean)
//         .join(' ');
//       return normalizeText(requestText).includes(query);
//     });

//     if (notificationSort === 'oldest') {
//       return filtered.sort(
//         (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
//       );
//     }
//     if (notificationSort === 'sla') {
//       return filtered.sort((a, b) => {
//         const aPriority =
//           a.sla_state === 'BREACHED' ? 0 : a.sla_state === 'AT_RISK' ? 1 : a.sla_state === 'ON_TRACK' ? 2 : 3;
//         const bPriority =
//           b.sla_state === 'BREACHED' ? 0 : b.sla_state === 'AT_RISK' ? 1 : b.sla_state === 'ON_TRACK' ? 2 : 3;
//         if (aPriority !== bPriority) return aPriority - bPriority;
//         return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
//       });
//     }
//     return filtered.sort(
//       (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
//     );
//   }, [connectorRequests, notificationSearch, notificationStatusFilter, notificationSort]);
//   const adminUser = users.find((u) => u.role === 'ADMIN') || null;
//   const canManageConnectors = isSuper;

//   async function fetchCompaniesList() {
//     const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     if (!res.ok) {
//       throw new Error(extractErrorMessage(await res.text(), 'Failed to load companies'));
//     }
//     return await res.json();
//   }

//   async function fetchConnectorCatalog() {
//     const res = await fetch(`${API_BASE_URL}/connectors/catalog`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     if (!res.ok) {
//       throw new Error(extractErrorMessage(await res.text(), 'Failed to load connector catalog'));
//     }
//     const rows = await res.json();
//     return rows.map((row) => ({
//       id: row.connector_id,
//       name: row.name,
//       type: row.type || 'Unknown',
//     }));
//   }

//   useEffect(() => {
//     let cancelled = false;

//     async function init() {
//       if (!token) {
//         setError('Missing token.');
//         setLoading(false);
//         return;
//       }

//       setLoading(true);
//       try {
//         const meRes = await fetch(`${API_BASE_URL}/me`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!meRes.ok) {
//           throw new Error(extractErrorMessage(await meRes.text(), 'Failed to load profile'));
//         }
//         const me = await meRes.json();
//         if (cancelled) return;

//         const catalog = await fetchConnectorCatalog();
//         if (cancelled) return;
//         setConnectorCatalog(catalog);

//         if (me.superadmin) {
//           setIsSuper(true);
//           setForbidden(false);
//           setViewMode('companies');
//           const comps = await fetchCompaniesList();
//           if (cancelled) return;
//           setCompanies(comps);
//           if (comps.length > 0) {
//             setSelectedTenant(comps[0].id);
//           }
//           // load external users for superadmin tracking
//           try {
//             const usersRes = await fetch(`${API_BASE_URL}/superadmin/users`, {
//               headers: { Authorization: `Bearer ${token}` },
//             });
//             if (usersRes.ok) {
//               const all = await usersRes.json();
//               if (!cancelled) {
//                 setOauthUsers(all.filter((u) => u.auth_provider && u.auth_provider !== 'LOCAL'));
//               }
//             }
//           } catch {
//             // ignore failures; this is just a convenience
//           }
//         } else if (me.role === 'ADMIN') {
//           setIsSuper(false);
//           setForbidden(false);
//           setViewMode('detail');
//           setSelectedTenant(effectiveTenantId || '');
//         } else {
//           setForbidden(true);
//         }
//       } catch (err) {
//         console.error(err);
//         if (!cancelled) {
//           setError('Unable to load admin page data.');
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     }

//     init();
//     return () => {
//       cancelled = true;
//     };
//   }, [token, effectiveTenantId]);

//   useEffect(() => {
//     setCompanyNameDraft(selectedCompany?.name || '');
//   }, [selectedTenant, selectedCompany?.name]);

//   useEffect(() => {
//     setSelectedRequestIds((prev) => {
//       const next = new Set();
//       const validIds = new Set(filteredConnectorRequests.map((request) => request.id));
//       prev.forEach((id) => {
//         if (validIds.has(id)) next.add(id);
//       });
//       return next;
//     });
//   }, [filteredConnectorRequests]);

//   useEffect(() => {
//     if (!token || !currentTenant || forbidden) {
//       setUsers([]);
//       setPurchasedConnectorIds(new Set());
//       setPurchasedConnectorMeta(new Map());
//       setSelectedMarketConns(new Set());
//       setSelectedPurchasedConns(new Set());
//       setConnectorRequests([]);
//       return;
//     }

//     let cancelled = false;

//     async function loadTenantData() {
//       setTenantLoading(true);
//       setConnectorLoading(true);
//       try {
//         const [usersRes, connectorsRes, requestsRes] = await Promise.all([
//           fetch(`${API_BASE_URL}/admin/${currentTenant}/users`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           fetch(`${API_BASE_URL}/admin/${currentTenant}/connector-requests`, {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);

//         if (!usersRes.ok) {
//           throw new Error(extractErrorMessage(await usersRes.text(), 'Failed to load users'));
//         }
//         if (!connectorsRes.ok) {
//           throw new Error(
//             extractErrorMessage(await connectorsRes.text(), 'Failed to load connectors'),
//           );
//         }

//         const [usersData, connectorsData, requestsData] = await Promise.all([
//           usersRes.json(),
//           connectorsRes.json(),
//           requestsRes.ok ? requestsRes.json() : Promise.resolve([]),
//         ]);
//         if (cancelled) return;

//         setUsers(usersData);
//         const purchasedIds = new Set();
//         const purchasedMeta = new Map();
//         connectorsData.forEach((connector) => {
//           const rawId = (connector.connector_id || connector.name || '').trim();
//           if (!rawId) return;
//           purchasedIds.add(rawId);
//           purchasedMeta.set(rawId, {
//             name: connector.name || rawId,
//             type: connector.category || connector.type || 'Unknown',
//           });
//         });

//         setPurchasedConnectorIds(purchasedIds);
//         setPurchasedConnectorMeta(purchasedMeta);
//         setConnectorRequests(
//           Array.isArray(requestsData)
//             ? requestsData.sort((a, b) => {
//                 const aTs = new Date(a.created_at || 0).getTime();
//                 const bTs = new Date(b.created_at || 0).getTime();
//                 return bTs - aTs;
//               })
//             : [],
//         );
//         setSelectedMarketConns(new Set());
//         setSelectedPurchasedConns(new Set());
//         setSelectedRequestIds(new Set());
//         setLastRefreshedAt(new Date().toISOString());
//       } catch (err) {
//         console.error(err);
//         if (!cancelled) {
//           setError('Unable to load tenant data.');
//         }
//       } finally {
//         if (!cancelled) {
//           setTenantLoading(false);
//           setConnectorLoading(false);
//         }
//       }
//     }

//     loadTenantData();
//     return () => {
//       cancelled = true;
//     };
//   }, [token, currentTenant, forbidden, refreshNonce]);

//   useEffect(() => {
//     if (error) {
//       setSnackbar({ open: true, message: error, severity: 'error' });
//       setError('');
//     }
//   }, [error]);

//   useEffect(() => {
//     if (info) {
//       setSnackbar({ open: true, message: info, severity: 'success' });
//       setInfo('');
//     }
//   }, [info]);

//   function closeSnackbar() {
//     setSnackbar(prev => ({ ...prev, open: false }));
//   }

//   function openCompany(companyId) {
//     navigate(`/admin/company/${companyId}`);
//   }

//   function backToCompanies() {
//     setError('');
//     setInfo('');
//     setEditingUser(null);
//     setConnectorSubTab('connectors');
//     setSelectedRequestIds(new Set());
//     setViewMode('companies');
//   }

//   function backToLanding() {
//     navigate('/');
//   }

//   function refreshTenantData() {
//     if (!currentTenant) return;
//     setRefreshNonce((prev) => prev + 1);
//     setInfo('Refreshing tenant data...');
//   }

//   async function copyTenantId() {
//     if (!currentTenant) return;
//     try {
//       await navigator.clipboard.writeText(currentTenant);
//       setInfo('Tenant ID copied.');
//     } catch {
//       setError('Could not copy tenant ID.');
//     }
//   }

//   function exportConnectorSnapshot() {
//     const rows = [
//       ...purchasedCatalog.map((connector) => [
//         'Prebuilt',
//         connector.id,
//         connector.name,
//         connector.type,
//       ]),
//       ...marketplaceCatalog.map((connector) => [
//         'Marketplace',
//         connector.id,
//         connector.name,
//         connector.type,
//       ]),
//     ];
//     downloadCsv(
//       `tenant-${currentTenant || 'unknown'}-connector-snapshot.csv`,
//       ['Section', 'Connector ID', 'Name', 'Type'],
//       rows,
//     );
//     setInfo('Connector snapshot exported.');
//   }

//   function exportRequestsSnapshot() {
//     const rows = connectorRequests.map((request) => [
//       request.id,
//       request.connector_id,
//       request.connector_name,
//       request.connector_type,
//       request.status,
//       request.requested_by_name || request.requested_by_email || '',
//       request.request_comment || '',
//       request.sla_state || '',
//       formatDateTime(request.created_at),
//       formatDateTime(request.decided_at),
//     ]);
//     downloadCsv(
//       `tenant-${currentTenant || 'unknown'}-connector-requests.csv`,
//       [
//         'Request ID',
//         'Connector ID',
//         'Connector Name',
//         'Connector Type',
//         'Status',
//         'Requester',
//         'Comment',
//         'SLA',
//         'Created At',
//         'Decided At',
//       ],
//       rows,
//     );
//     setInfo('Connector request report exported.');
//   }

//   function toggleRequestSelection(requestId) {
//     setSelectedRequestIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(requestId)) next.delete(requestId);
//       else next.add(requestId);
//       return next;
//     });
//   }

//   function selectAllPendingRequests() {
//     const pendingIds = filteredConnectorRequests
//       .filter((request) => request.status === 'PENDING')
//       .map((request) => request.id);
//     setSelectedRequestIds(new Set(pendingIds));
//   }

//   function clearSelectedRequests() {
//     setSelectedRequestIds(new Set());
//   }

//   async function handleDeleteCompany() {
//     if (!isSuper || !selectedTenant) return;
//     if (!window.confirm('Delete this company and all its data?')) return;

//     setError('');
//     setInfo('');
//     try {
//       const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to delete company'));
//       }

//       const comps = await fetchCompaniesList();
//       setCompanies(comps);
//       setViewMode('companies');
//       if (!comps.some((c) => c.id === selectedTenant)) {
//         setSelectedTenant(comps[0]?.id || '');
//       }
//       setUsers([]);
//       setPurchasedConnectorIds(new Set());
//       setPurchasedConnectorMeta(new Map());
//       setConnectorRequests([]);
//       setInfo('Company deleted.');
//     } catch (err) {
//       console.error(err);
//       setError('Unable to delete company.');
//     }
//   }

//   async function handleRemoveAdmin() {
//     if (!isSuper || !selectedTenant) return;
//     if (!window.confirm('Remove the admin user for this company?')) return;

//     setError('');
//     setInfo('');
//     try {
//       const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}/admin`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to remove admin'));
//       }

//       const listRes = await fetch(`${API_BASE_URL}/admin/${selectedTenant}/users`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!listRes.ok) {
//         throw new Error(extractErrorMessage(await listRes.text(), 'Failed to refresh users'));
//       }
//       setUsers(await listRes.json());
//       setInfo('Admin removed.');
//     } catch (err) {
//       console.error(err);
//       setError('Unable to remove admin.');
//     }
//   }

//   async function handleRenameCompany() {
//     if (!isSuper || !selectedTenant) return;
//     const nextName = companyNameDraft.trim();
//     if (!nextName) {
//       setError('Company name cannot be empty.');
//       return;
//     }

//     setError('');
//     setInfo('');
//     try {
//       const res = await fetch(`${API_BASE_URL}/superadmin/companies/${selectedTenant}`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ name: nextName }),
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to rename company'));
//       }
//       setCompanies((prev) =>
//         prev.map((company) =>
//           company.id === selectedTenant ? { ...company, name: nextName } : company,
//         ),
//       );
//       setInfo('Company name updated.');
//     } catch (err) {
//       console.error(err);
//       setError('Unable to rename company.');
//     }
//   }

//   function toggleMarketplaceSelection(connectorId) {
//     if (!canManageConnectors) return;
//     setSelectedMarketConns((prev) => {
//       const next = new Set(prev);
//       if (next.has(connectorId)) next.delete(connectorId);
//       else next.add(connectorId);
//       return next;
//     });
//   }

//   function togglePurchasedSelection(connectorId) {
//     if (!canManageConnectors) return;
//     setSelectedPurchasedConns((prev) => {
//       const next = new Set(prev);
//       if (next.has(connectorId)) next.delete(connectorId);
//       else next.add(connectorId);
//       return next;
//     });
//   }

//   function selectAllFilteredMarketplace() {
//     if (!canManageConnectors) return;
//     setSelectedMarketConns((prev) => {
//       const next = new Set(prev);
//       filteredMarketplaceCatalog.forEach((connector) => next.add(connector.id));
//       return next;
//     });
//   }

//   function clearMarketplaceSelection() {
//     if (!canManageConnectors) return;
//     setSelectedMarketConns(new Set());
//   }

//   function selectAllFilteredPrebuilt() {
//     if (!canManageConnectors) return;
//     setSelectedPurchasedConns((prev) => {
//       const next = new Set(prev);
//       filteredPurchasedCatalog.forEach((connector) => next.add(connector.id));
//       return next;
//     });
//   }

//   function clearPrebuiltSelection() {
//     if (!canManageConnectors) return;
//     setSelectedPurchasedConns(new Set());
//   }

//   async function purchaseSelectedConnectors() {
//     if (!canManageConnectors) {
//       setError('Only superadmin can manage connectors.');
//       return;
//     }
//     if (!currentTenant || selectedMarketConns.size === 0) return;
//     setError('');
//     setInfo('');
//     setConnectorBusy(true);

//     try {
//       const ids = Array.from(selectedMarketConns);
//       await Promise.all(
//         ids.map(async (connectorId) => {
//           const connector = catalogById.get(connectorId);
//           const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify({
//               connector_id: connectorId,
//               name: connector?.name || connectorId,
//               category: connector?.type || '',
//               type: 'prebuilt',
//               logo_url: connector?.logoUrl || '',
//               external_url: connector?.url || '',
//             }),
//           });
//           if (!res.ok && res.status !== 409) {
//             throw new Error(extractErrorMessage(await res.text(), 'Failed to purchase connector'));
//           }
//         }),
//       );

//       setPurchasedConnectorIds((prev) => {
//         const next = new Set(prev);
//         ids.forEach((id) => next.add(id));
//         return next;
//       });
//       setSelectedMarketConns(new Set());
//       setInfo(`Purchased ${ids.length} connector${ids.length > 1 ? 's' : ''}.`);
//     } catch (err) {
//       console.error(err);
//       setError('Unable to purchase selected connectors.');
//     } finally {
//       setConnectorBusy(false);
//     }
//   }

//   async function moveSelectedToMarketplace() {
//     if (!canManageConnectors) {
//       setError('Only superadmin can manage connectors.');
//       return;
//     }
//     if (!currentTenant || selectedPurchasedConns.size === 0) return;
//     setError('');
//     setInfo('');
//     setConnectorBusy(true);

//     try {
//       const ids = Array.from(selectedPurchasedConns);
//       await Promise.all(
//         ids.map(async (connectorId) => {
//           const res = await fetch(
//             `${API_BASE_URL}/admin/${currentTenant}/connectors/${encodeURIComponent(connectorId)}`,
//             {
//               method: 'DELETE',
//               headers: { Authorization: `Bearer ${token}` },
//             },
//           );
//           if (!res.ok && res.status !== 404) {
//             throw new Error(
//               extractErrorMessage(await res.text(), 'Failed to move connector to marketplace'),
//             );
//           }
//         }),
//       );

//       setPurchasedConnectorIds((prev) => {
//         const next = new Set(prev);
//         ids.forEach((id) => next.delete(id));
//         return next;
//       });
//       setPurchasedConnectorMeta((prev) => {
//         const next = new Map(prev);
//         ids.forEach((id) => next.delete(id));
//         return next;
//       });
//       setSelectedPurchasedConns(new Set());
//       setInfo(`Moved ${ids.length} connector${ids.length > 1 ? 's' : ''} to Marketplace.`);
//     } catch (err) {
//       console.error(err);
//       setError('Unable to update purchased connectors.');
//     } finally {
//       setConnectorBusy(false);
//     }
//   }

//   async function handleConnectorRequestDecision(request, action) {
//     if (!isSuper) return;
//     if (!request?.id) return;

//     setError('');
//     setInfo('');
//     setRequestBusyId(request.id);
//     try {
//       const payload = { action };
//       if (action === 'grant') {
//         const url = window.prompt('Optional access URL to provide to tenant (leave blank if none):');
//         if (url) payload.granted_access_url = url;
//       }
//       const res = await fetch(`${API_BASE_URL}/superadmin/connector-requests/${request.id}`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to process connector request'));
//       }
//       const updated = await res.json();
//       setConnectorRequests((prev) =>
//         prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
//       );
//       if (updated.status === 'GRANTED') {
//         setPurchasedConnectorIds((prev) => {
//           const next = new Set(prev);
//           next.add(updated.connector_id);
//           return next;
//         });
//         setPurchasedConnectorMeta((prev) => {
//           const next = new Map(prev);
//           next.set(updated.connector_id, {
//             name: updated.connector_name || updated.connector_id,
//             type: updated.connector_type || 'Unknown',
//           });
//           return next;
//         });
//       }
//       setInfo(
//         action === 'grant'
//           ? `Granted request for ${updated.connector_name || updated.connector_id}.`
//           : `Declined request for ${updated.connector_name || updated.connector_id}.`,
//       );
//       setSelectedRequestIds((prev) => {
//         const next = new Set(prev);
//         next.delete(request.id);
//         return next;
//       });
//     } catch (err) {
//       console.error(err);
//       setError('Unable to process connector request.');
//     } finally {
//       setRequestBusyId('');
//     }
//   }

//   async function handleBulkConnectorRequestDecision(action) {
//     const pendingSelection = filteredConnectorRequests.filter(
//       (request) => request.status === 'PENDING' && selectedRequestIds.has(request.id),
//     );
//     if (pendingSelection.length === 0) {
//       setError('Select at least one pending request.');
//       return;
//     }

//     setError('');
//     setInfo('');
//     for (const request of pendingSelection) {
//       // eslint-disable-next-line no-await-in-loop
//       await handleConnectorRequestDecision(request, action);
//     }
//     setSelectedRequestIds(new Set());
//     setInfo(
//       `${action === 'grant' ? 'Granted' : 'Declined'} ${pendingSelection.length} selected request${
//         pendingSelection.length > 1 ? 's' : ''
//       }.`,
//     );
//   }

//   async function handleCreateUser(e) {
//     e.preventDefault();
//     if (!currentTenant) return;

//     setError('');
//     setInfo('');
//     try {
//       const params = new URLSearchParams();
//       params.append('email', form.email);
//       params.append('full_name', form.fullName);
//       params.append('password', form.password);

//       const res = await fetch(
//         `${API_BASE_URL}/admin/${currentTenant}/users?${params.toString()}`,
//         {
//           method: 'POST',
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );

//       if (!res.ok) {
//         const detail = extractErrorMessage(await res.text(), 'Failed to create user');
//         if (detail?.toLowerCase().includes('tenant already has an admin')) {
//           setError(detail);
//           return;
//         }
//         throw new Error(detail);
//       }

//       const created = await res.json();
//       setUsers((prev) => [...prev, created]);
//       setForm({ email: '', fullName: '', password: '' });
//       if (created.role === 'ADMIN') {
//         setInfo('Tenant had no admin; this user was promoted to ADMIN.');
//       }
//     } catch (err) {
//       console.error(err);
//       setError('Unable to create user.');
//     }
//   }

//   function startEdit(user) {
//     setEditingUser(user.id);
//     setEditForm({ fullName: user.full_name || '', password: '' });
//   }

//   function cancelEdit() {
//     setEditingUser(null);
//   }

//   async function handleUpdateUser(e) {
//     e.preventDefault();
//     if (!editingUser || !currentTenant) return;

//     setError('');
//     try {
//       if (editForm.fullName) {
//         const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${editingUser}`, {
//           method: 'PATCH',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ full_name: editForm.fullName }),
//         });
//         if (!res.ok) {
//           throw new Error(extractErrorMessage(await res.text(), 'Failed to update user'));
//         }
//       }

//       if (editForm.password) {
//         const res2 = await fetch(
//           `${API_BASE_URL}/admin/${currentTenant}/users/${editingUser}/password`,
//           {
//             method: 'PATCH',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify({ new_password: editForm.password }),
//           },
//         );
//         if (!res2.ok) {
//           throw new Error(extractErrorMessage(await res2.text(), 'Failed to change password'));
//         }
//       }

//       setUsers((prev) =>
//         prev.map((u) => (u.id === editingUser ? { ...u, full_name: editForm.fullName } : u)),
//       );
//       setEditingUser(null);
//     } catch (err) {
//       console.error(err);
//       setError('Unable to update user.');
//     }
//   }

//   async function handleDeleteUser(userId) {
//     if (!currentTenant) return;

//     const target = users.find((u) => u.id === userId);
//     if (target?.role === 'ADMIN' && !isSuper) {
//       setError('Company admin cannot be deleted.');
//       return;
//     }

//     if (!window.confirm('Are you sure you want to delete this user?')) return;

//     setError('');
//     try {
//       const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${userId}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to delete user'));
//       }
//       setUsers((prev) => prev.filter((u) => u.id !== userId));
//       if (editingUser === userId) setEditingUser(null);
//     } catch (err) {
//       console.error(err);
//       setError('Unable to delete user.');
//     }
//   }

//   if (loading) {
//     return <div style={{ padding: 24, color: '#0f172a' }}>Loading admin page…</div>;
//   }

//   if (forbidden) {
//     return <div style={{ padding: 24, color: '#0f172a' }}>You are not an admin for this tenant.</div>;
//   }

//   return (
//     <div className={`admin-container ${isSuper ? 'superadmin-theme' : 'admin-theme'}`}>
//       <CommonSnackbar
//         open={snackbar.open}
//         onClose={closeSnackbar}
//         message={snackbar.message}
//         severity={snackbar.severity}
//         position={{ vertical: 'top', horizontal: 'center' }}
//         sx={{
//           '& .MuiAlert-root': {
//             width: '100%',
//             maxWidth: '100%',
//             borderRadius: 0,
//           },
//           '& .MuiSnackbar-root': {
//             left: '0 !important',
//             right: '0 !important',
//             transform: 'none !important',
//             width: '100%',
//           }
//         }}
//       />

//       {isSuper && viewMode === 'companies' && (
//         <section className="companies-home">
//           <div className="companies-home-header">
//             <div>
//               <h1 className="admin-header">Companies</h1>
//               <p className="admin-subtext">
//                 Select a company to manage admin details, users, and connectors.
//               </p>
//             </div>
//             <div className="companies-home-actions">
//               <button type="button" className="secondary-btn" onClick={backToLanding}>
//                 Back to Main Landing
//               </button>
//               <button
//                 type="button"
//                 className="primary-btn"
//                 onClick={() => setShowCompanyForm((prev) => !prev)}
//               >
//                 Create Company
//               </button>
//             </div>
//           {isSuper && oauthUsers.length > 0 && (
//             <div className="oauth-users-panel">
//               <h2>External Users</h2>
//               <ul>
//                 {oauthUsers.map((u) => (
//                   <li key={u.id}>{u.email} ({u.auth_provider})</li>
//                 ))}
//               </ul>
//             </div>
//           )}
//           </div>

//           <div className="companies-toolbar">
//             <label>
//               Search Company
//               <input
//                 type="search"
//                 placeholder="Search by company name or tenant id"
//                 value={companySearch}
//                 onChange={(e) => setCompanySearch(e.target.value)}
//               />
//             </label>
//             <div className="companies-count-pill">
//               Showing {filteredCompanies.length} / {companies.length}
//             </div>
//           </div>

//           {showCompanyForm && (
//             <div className="company-form-card">
//               <CompanyForm
//                 setCompanies={setCompanies}
//                 token={token}
//                 connectorCatalog={connectorCatalog}
//                 onSuccess={(tenantId) => {
//                   setShowCompanyForm(false);
//                   setSelectedTenant(tenantId);
//                   setInfo('Company created. Click the company card to open details.');
//                 }}
//               />
//             </div>
//           )}

//           {companies.length === 0 ? (
//             <div className="empty-state">No companies exist. Create a company to get started.</div>
//           ) : filteredCompanies.length === 0 ? (
//             <div className="empty-state">No company matches the current search.</div>
//           ) : (
//             <div className="company-cards-grid">
//               {filteredCompanies.map((company) => (
//                 <button
//                   key={company.id}
//                   type="button"
//                   className="company-card"
//                   onClick={() => openCompany(company.id)}
//                 >
//                   <div className="company-card-title">{company.name}</div>
//                   <div className="company-card-meta">{company.id}</div>
//                 </button>
//               ))}
//             </div>
//           )}

//           <div className="catalog-table-section">
//             <h2 className="connector-manager-title">Prebuilt Connector Catalog</h2>
//             <p className="admin-subtext">
//               Source of truth loaded from the latest connector workbook.
//             </p>
//             <div className="catalog-toolbar">
//               <label>
//                 Search Catalog
//                 <input
//                   type="search"
//                   placeholder="Search by connector name, type, or id"
//                   value={catalogSearch}
//                   onChange={(e) => setCatalogSearch(e.target.value)}
//                 />
//               </label>
//               <label>
//                 Type
//                 <select
//                   value={catalogTypeFilter}
//                   onChange={(e) => setCatalogTypeFilter(e.target.value)}
//                 >
//                   {catalogTypeOptions.map((type) => (
//                     <option key={type} value={type}>
//                       {type === 'ALL' ? 'All Types' : type}
//                     </option>
//                   ))}
//                 </select>
//               </label>
//               <label>
//                 Sort
//                 <select value={catalogSort} onChange={(e) => setCatalogSort(e.target.value)}>
//                   <option value="asc">A → Z</option>
//                   <option value="desc">Z → A</option>
//                 </select>
//               </label>
//               <div className="catalog-count-pill">
//                 {filteredCatalog.length} of {connectorCatalog.length}
//               </div>
//             </div>

//             <div className="catalog-grid">
//               {filteredCatalog.map((connector) => (
//                 <article key={connector.id} className="catalog-card">
//                   <h3>{connector.name}</h3>
//                   <span className="catalog-card-type">{connector.type}</span>
//                   <code>{connector.id}</code>
//                 </article>
//               ))}
//               {connectorCatalog.length === 0 && (
//                 <div className="empty-state">No connector catalog data available.</div>
//               )}
//               {connectorCatalog.length > 0 && filteredCatalog.length === 0 && (
//                 <div className="empty-state">No connectors match the current catalog filter.</div>
//               )}
//             </div>
//           </div>
//         </section>
//       )}

//       {(!isSuper || viewMode === 'detail') && (
//         <section className="company-detail-page">
//           <div className="detail-nav-row">
//             {isSuper && (
//               <button type="button" className="back-btn" onClick={backToCompanies}>
//                 ← Back to Companies
//               </button>
//             )}
//             <button type="button" className="back-btn" onClick={backToLanding}>
//               ← Back to Main Landing
//             </button>
//           </div>

//           <div className="detail-header">
//             <h1 className="admin-header">{selectedCompany?.name || 'Tenant'}</h1>
//             <p className="admin-subtext">
//               Tenant ID: <code>{currentTenant}</code>
//             </p>
//             <div className="tenant-utility-row">
//               <button type="button" className="secondary-btn" onClick={copyTenantId}>
//                 Copy Tenant ID
//               </button>
//               <button
//                 type="button"
//                 className="secondary-btn"
//                 onClick={refreshTenantData}
//                 disabled={tenantLoading || connectorLoading}
//               >
//                 Refresh Data
//               </button>
//               {/* <span className="tenant-refresh-meta">
//                 Last refreshed: {formatDateTime(lastRefreshedAt)}
//               </span> */}
//             </div>
//           </div>

//           <div className="detail-tabs" style={{ borderBottomColor: 'var(--border)' }}>
//             <button
//               type="button"
//               className={`detail-tab ${detailTab === 'admin' ? 'active' : ''}`}
//               onClick={() => setDetailTab('admin')}
//               onMouseEnter={(e) => {
//                 if (detailTab !== 'admin') {
//                   e.target.style.backgroundColor = 'var(--brand-hover)';
//                 }
//               }}
//               onMouseLeave={(e) => {
//                 if (detailTab !== 'admin') {
//                   e.target.style.backgroundColor = 'var(--bg-card)';
//                 }
//               }}
//               style={{
//                 borderColor: detailTab === 'admin' ? 'transparent' : 'var(--border)',
//                 color: detailTab === 'admin' ? '#ffffff' : 'var(--text-primary)',
//                 backgroundColor: detailTab === 'admin' ? 'var(--brand-primary)' : 'var(--bg-card)',
//                 transition: 'all 0.2s ease'
//               }}
//             >
//               Admin Details
//             </button>
//             <button
//               type="button"
//               className={`detail-tab ${detailTab === 'users' ? 'active' : ''}`}
//               onClick={() => setDetailTab('users')}
//               onMouseEnter={(e) => {
//                 if (detailTab !== 'users') {
//                   e.target.style.backgroundColor = 'var(--brand-hover)';
//                 }
//               }}
//               onMouseLeave={(e) => {
//                 if (detailTab !== 'users') {
//                   e.target.style.backgroundColor = 'var(--bg-card)';
//                 }
//               }}
//               style={{
//                 borderColor: detailTab === 'users' ? 'transparent' : 'var(--border)',
//                 color: detailTab === 'users' ? '#ffffff' : 'var(--text-primary)',
//                 backgroundColor: detailTab === 'users' ? 'var(--brand-primary)' : 'var(--bg-card)',
//                 transition: 'all 0.2s ease'
//               }}
//             >
//               Users
//             </button>
//             {isSuper && (
//               <button
//                 type="button"
//                 className={`detail-tab ${detailTab === 'connectors' ? 'active' : ''}`}
//                 onClick={() => setDetailTab('connectors')}
//                 onMouseEnter={(e) => {
//                   if (detailTab !== 'connectors') {
//                     e.target.style.backgroundColor = 'var(--brand-hover)';
//                   }
//                 }}
//                 onMouseLeave={(e) => {
//                   if (detailTab !== 'connectors') {
//                     e.target.style.backgroundColor = 'var(--bg-card)';
//                   }
//                 }}
//                 style={{
//                   borderColor: detailTab === 'connectors' ? 'transparent' : 'var(--border)',
//                   color: detailTab === 'connectors' ? '#ffffff' : 'var(--text-primary)',
//                   backgroundColor: detailTab === 'connectors' ? 'var(--brand-primary)' : 'var(--bg-card)',
//                   transition: 'all 0.2s ease'
//                 }}
//               >
//                 Connectors
//               </button>
//             )}
//           </div>

//           {detailTab === 'admin' && (
//             <div className="detail-panel">
//               {isSuper && (
//                 <>
//                   <div className="company-edit-row">
//                     <label>
//                       Company name
//                       <input
//                         value={companyNameDraft}
//                         onChange={(e) => setCompanyNameDraft(e.target.value)}
//                         placeholder="Company name"
//                       />
//                     </label>
//                     <button type="button" className="primary-btn" onClick={handleRenameCompany}>
//                       Save Name
//                     </button>
//                   </div>

//                   <div className="company-actions-row">
//                     <button type="button" className="danger-btn" onClick={handleDeleteCompany}>
//                       Delete Company
//                     </button>
//                     <button
//                       type="button"
//                       className="secondary-btn"
//                       onClick={handleRemoveAdmin}
//                       disabled={!adminUser}
//                     >
//                       Remove Admin
//                     </button>
//                   </div>
//                 </>
//               )}

//               <div className="admin-summary-grid">
//                 <div className="summary-card">
//                   <h3>Admin Account</h3>
//                   {adminUser ? (
//                     <>
//                       <p><strong>Email:</strong> {adminUser.email}</p>
//                       <p><strong>Name:</strong> {adminUser.full_name || '-'}</p>
//                     </>
//                   ) : (
//                     <p>No admin assigned.</p>
//                   )}
//                 </div>
//                 <div className="summary-card">
//                   <h3>User Summary</h3>
//                   <p><strong>Total users:</strong> {users.length}</p>
//                   <p>
//                     <strong>Members:</strong>{' '}
//                     {users.filter((user) => user.role !== 'ADMIN').length}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}

//           {detailTab === 'users' && (
//             <div className="detail-panel">
//               {tenantLoading ? (
//                 <p className="admin-subtext">Loading users…</p>
//               ) : (
//                 <>
//                   <h2 className="connector-manager-title">Tenant Users</h2>
//                   <p className="admin-subtext">
//                     {!adminUser
//                       ? 'Create the administrator for this tenant:'
//                       : 'Create a member for this tenant:'}
//                   </p>

//                   <form onSubmit={handleCreateUser} className="admin-form">
//                     <div className="field">
//                       <label>
//                         Email
//                         <input
//                           type="email"
//                           required
//                           value={form.email}
//                           onChange={(e) => setForm({ ...form, email: e.target.value })}
//                         />
//                       </label>
//                     </div>
//                     <div className="field">
//                       <label>
//                         Full name
//                         <input
//                           type="text"
//                           required
//                           value={form.fullName}
//                           onChange={(e) => setForm({ ...form, fullName: e.target.value })}
//                         />
//                       </label>
//                     </div>
//                     <div className="field">
//                       <label>
//                         Password
//                         <input
//                           type="password"
//                           required
//                           value={form.password}
//                           onChange={(e) => setForm({ ...form, password: e.target.value })}
//                         />
//                       </label>
//                     </div>
//                     <button type="submit">Add User</button>
//                   </form>

//                   <table className="admin-table">
//                     <thead>
//                       <tr>
//                         <th>Email</th>
//                         <th>Name</th>
//                         <th>Role</th>
//                         <th>Created</th>
//                         <th>Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {users.map((user) => (
//                         <tr key={user.id}>
//                           <td>{user.email}</td>
//                           <td>
//                             {editingUser === user.id ? (
//                               <>
//                                 <input
//                                   type="text"
//                                   value={editForm.fullName}
//                                   onChange={(e) =>
//                                     setEditForm({ ...editForm, fullName: e.target.value })
//                                   }
//                                   style={{ width: '100%', padding: 4, marginBottom: 4 }}
//                                   placeholder="Full name"
//                                 />
//                                 <input
//                                   type="password"
//                                   value={editForm.password || ''}
//                                   onChange={(e) =>
//                                     setEditForm({ ...editForm, password: e.target.value })
//                                   }
//                                   style={{ width: '100%', padding: 4 }}
//                                   placeholder="New password (leave blank)"
//                                 />
//                               </>
//                             ) : (
//                               user.full_name
//                             )}
//                           </td>
//                           <td>{user.role}</td>
//                           <td>{user.created_at ? new Date(user.created_at).toLocaleString() : ''}</td>
//                           <td className="admin-actions">
//                             {editingUser === user.id ? (
//                               <>
//                                 <button onClick={handleUpdateUser}>Save</button>
//                                 <button onClick={cancelEdit}>Cancel</button>
//                               </>
//                             ) : (
//                               <>
//                                 <button onClick={() => startEdit(user)}>Edit</button>
//                                 {user.role === 'ADMIN' && !isSuper ? (
//                                   <button
//                                     type="button"
//                                     disabled
//                                     title="Company admin cannot be deleted"
//                                   >
//                                     Protected
//                                   </button>
//                                 ) : (
//                                   <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
//                                 )}
//                               </>
//                             )}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </>
//               )}
//             </div>
//           )}

//           {isSuper && detailTab === 'connectors' && (
//             <div className="detail-panel connectors-panel">
//               <div className="connectors-panel-head">
//                 <div>
//                   <h2 className="connector-manager-title">Connector Governance</h2>
//                   <p className="admin-subtext">
//                     Manage tenant prebuilt entitlements, marketplace inventory, and approval activity.
//                   </p>
//                 </div>
//                 <div className="connector-kpi-grid">
//                   <div className="connector-kpi-card">
//                     <span>Prebuilt</span>
//                     <strong>{purchasedCatalog.length}</strong>
//                   </div>
//                   <div className="connector-kpi-card">
//                     <span>Marketplace</span>
//                     <strong>{marketplaceCatalog.length}</strong>
//                   </div>
//                   <div className="connector-kpi-card">
//                     <span>Pending</span>
//                     <strong>{pendingConnectorRequests.length}</strong>
//                   </div>
//                 </div>
//               </div>

//               <div className="connector-subtabs">
//                 <button
//                   type="button"
//                   className={`connector-subtab ${connectorSubTab === 'connectors' ? 'active' : ''}`}
//                   onClick={() => setConnectorSubTab('connectors')}
//                 >
//                   Connector Section
//                 </button>
//                 <button
//                   type="button"
//                   className={`connector-subtab ${connectorSubTab === 'notifications' ? 'active' : ''}`}
//                   onClick={() => setConnectorSubTab('notifications')}
//                 >
//                   Notifications ({pendingConnectorRequests.length})
//                 </button>
//               </div>

//               {connectorLoading ? (
//                 <div className="admin-subtext">Loading connectors…</div>
//               ) : connectorSubTab === 'connectors' ? (
//                 <>
//                   <div className="connector-toolbar">
//                     <label>
//                       Search
//                       <input
//                         type="search"
//                         placeholder="Search by connector name, type, or id"
//                         value={connectorSearch}
//                         onChange={(e) => setConnectorSearch(e.target.value)}
//                       />
//                     </label>
//                     <label>
//                       Type
//                       <select
//                         value={connectorTypeFilter}
//                         onChange={(e) => setConnectorTypeFilter(e.target.value)}
//                       >
//                         {connectorTypeOptions.map((type) => (
//                           <option key={type} value={type}>
//                             {type === 'ALL' ? 'All Types' : type}
//                           </option>
//                         ))}
//                       </select>
//                     </label>
//                     <label>
//                       Sort
//                       <select
//                         value={connectorSort}
//                         onChange={(e) => setConnectorSort(e.target.value)}
//                       >
//                         <option value="asc">A → Z</option>
//                         <option value="desc">Z → A</option>
//                       </select>
//                     </label>
//                     <label>
//                       Density
//                       <select
//                         value={connectorDensity}
//                         onChange={(e) => setConnectorDensity(e.target.value)}
//                       >
//                         <option value="cozy">Cozy</option>
//                         <option value="compact">Compact</option>
//                       </select>
//                     </label>
//                   </div>
//                   <div className="connector-toolbar-actions">
//                     <button type="button" className="secondary-btn" onClick={exportConnectorSnapshot}>
//                       Export Connectors CSV
//                     </button>
//                   </div>

//                   <div className={`connector-grid-layout ${connectorDensity === 'compact' ? 'compact' : 'cozy'}`}>
//                     <section className="connector-card-panel">
//                       <div className="connector-panel-head">
//                         <h3>Prebuilt ({filteredPurchasedCatalog.length})</h3>
//                         <div className="connector-panel-actions">
//                           <button type="button" onClick={selectAllFilteredPrebuilt}>
//                             Select Filtered
//                           </button>
//                           <button type="button" onClick={clearPrebuiltSelection}>
//                             Clear
//                           </button>
//                         </div>
//                       </div>
//                       <div className="connector-card-grid">
//                         {filteredPurchasedCatalog.length === 0 ? (
//                           <div className="connector-empty">No prebuilt connectors for this filter.</div>
//                         ) : (
//                           filteredPurchasedCatalog.map((connector) => (
//                             <label
//                               key={connector.id}
//                               className={`connector-grid-card ${
//                                 selectedPurchasedConns.has(connector.id) ? 'selected' : ''
//                               }`}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={selectedPurchasedConns.has(connector.id)}
//                                 onChange={() => togglePurchasedSelection(connector.id)}
//                                 disabled={connectorBusy}
//                               />
//                               <div className="connector-grid-name">{connector.name}</div>
//                               <div className="connector-grid-type">{connector.type}</div>
//                               <div className="connector-grid-id">{connector.id}</div>
//                             </label>
//                           ))
//                         )}
//                       </div>
//                       <button
//                         type="button"
//                         className="connector-action"
//                         onClick={moveSelectedToMarketplace}
//                         disabled={connectorBusy || selectedPurchasedConns.size === 0}
//                       >
//                         Move Selected to Marketplace ({selectedPurchasedConns.size})
//                       </button>
//                     </section>

//                     <section className="connector-card-panel">
//                       <div className="connector-panel-head">
//                         <h3>Marketplace ({filteredMarketplaceCatalog.length})</h3>
//                         <div className="connector-panel-actions">
//                           <button type="button" onClick={selectAllFilteredMarketplace}>
//                             Select Filtered
//                           </button>
//                           <button type="button" onClick={clearMarketplaceSelection}>
//                             Clear
//                           </button>
//                         </div>
//                       </div>
//                       <div className="connector-card-grid">
//                         {filteredMarketplaceCatalog.length === 0 ? (
//                           <div className="connector-empty">No marketplace connectors for this filter.</div>
//                         ) : (
//                           filteredMarketplaceCatalog.map((connector) => (
//                             <label
//                               key={connector.id}
//                               className={`connector-grid-card ${
//                                 selectedMarketConns.has(connector.id) ? 'selected' : ''
//                               }`}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={selectedMarketConns.has(connector.id)}
//                                 onChange={() => toggleMarketplaceSelection(connector.id)}
//                                 disabled={connectorBusy}
//                               />
//                               <div className="connector-grid-name">{connector.name}</div>
//                               <div className="connector-grid-type">{connector.type}</div>
//                               <div className="connector-grid-id">{connector.id}</div>
//                             </label>
//                           ))
//                         )}
//                       </div>
//                       <button
//                         type="button"
//                         className="connector-action"
//                         onClick={purchaseSelectedConnectors}
//                         disabled={connectorBusy || selectedMarketConns.size === 0}
//                       >
//                         Add Selected to Prebuilt ({selectedMarketConns.size})
//                       </button>
//                     </section>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="notification-toolbar">
//                     <label>
//                       Search Requests
//                       <input
//                         type="search"
//                         placeholder="Search requester, connector, status, comments"
//                         value={notificationSearch}
//                         onChange={(e) => setNotificationSearch(e.target.value)}
//                       />
//                     </label>
//                     <label>
//                       Status
//                       <select
//                         value={notificationStatusFilter}
//                         onChange={(e) => setNotificationStatusFilter(e.target.value)}
//                       >
//                         <option value="ALL">All</option>
//                         <option value="PENDING">Pending</option>
//                         <option value="GRANTED">Granted</option>
//                         <option value="DECLINED">Declined</option>
//                       </select>
//                     </label>
//                     <label>
//                       Sort
//                       <select
//                         value={notificationSort}
//                         onChange={(e) => setNotificationSort(e.target.value)}
//                       >
//                         <option value="newest">Newest First</option>
//                         <option value="oldest">Oldest First</option>
//                         <option value="sla">SLA Priority</option>
//                       </select>
//                     </label>
//                   </div>
//                   <div className="notification-toolbar-actions">
//                     <button type="button" className="secondary-btn" onClick={selectAllPendingRequests}>
//                       Select Pending
//                     </button>
//                     <button type="button" className="secondary-btn" onClick={clearSelectedRequests}>
//                       Clear Selection
//                     </button>
//                     <button
//                       type="button"
//                       className="primary-btn"
//                       onClick={() => handleBulkConnectorRequestDecision('grant')}
//                       disabled={selectedRequestIds.size === 0}
//                     >
//                       Grant Selected ({selectedRequestIds.size})
//                     </button>
//                     <button
//                       type="button"
//                       className="danger-btn"
//                       onClick={() => handleBulkConnectorRequestDecision('decline')}
//                       disabled={selectedRequestIds.size === 0}
//                     >
//                       Decline Selected ({selectedRequestIds.size})
//                     </button>
//                     <button type="button" className="secondary-btn" onClick={exportRequestsSnapshot}>
//                       Export Requests CSV
//                     </button>
//                   </div>
//                   {filteredConnectorRequests.length === 0 ? (
//                     <div className="connector-empty">No connector request notifications found.</div>
//                   ) : (
//                     <div className="request-card-grid">
//                       {filteredConnectorRequests.map((request) => (
//                         <div key={request.id} className="connector-request-item">
//                           {request.status === 'PENDING' && (
//                             <label className="request-select-control">
//                               <input
//                                 type="checkbox"
//                                 checked={selectedRequestIds.has(request.id)}
//                                 onChange={() => toggleRequestSelection(request.id)}
//                               />
//                               Select for bulk action
//                             </label>
//                           )}
//                           <div className="connector-request-head">
//                             <div className="connector-request-title">
//                               {request.connector_name || request.connector_id}
//                             </div>
//                             <span className="connector-request-type">
//                               {request.connector_type || 'Unknown'}
//                             </span>
//                           </div>

//                           <div className={`connector-request-status status-${String(request.status || '').toLowerCase()}`}>
//                             {request.status}
//                           </div>

//                           {(request.requested_by_name || request.requested_by_email) && (
//                             <div className="connector-request-meta">
//                               Requested by {request.requested_by_name || request.requested_by_email}
//                             </div>
//                           )}
//                           {request.request_comment && (
//                             <div className="connector-request-comment">
//                               Comment: {request.request_comment}
//                             </div>
//                           )}
//                           {request.attachment_url && (
//                             <a
//                               className="connector-request-attachment"
//                               href={request.attachment_url}
//                               target="_blank"
//                               rel="noreferrer"
//                             >
//                               Attachment: {request.attachment_name || 'Open attachment'}
//                             </a>
//                           )}
//                           {request.granted_access_url && (
//                             <div className="connector-request-link">
//                               Access URL: <span className="link-val">{request.granted_access_url}</span>{' '}
//                               <button
//                                 type="button"
//                                 className="copy-link-btn"
//                                 onClick={() => navigator.clipboard.writeText(request.granted_access_url)}
//                               >
//                                 Copy
//                               </button>
//                             </div>
//                           )}
//                           {request.sla_state && request.status === 'PENDING' && (
//                             <div
//                               className={`connector-request-sla sla-${String(request.sla_state || '').toLowerCase()}`}
//                             >
//                               SLA: {request.sla_state}
//                             </div>
//                           )}

//                           <div className="connector-request-time">
//                             Requested:{' '}
//                             {request.created_at
//                               ? new Date(request.created_at).toLocaleString()
//                               : '-'}
//                           </div>
//                           {request.decided_at && (
//                             <div className="connector-request-time">
//                               Decision: {new Date(request.decided_at).toLocaleString()}
//                             </div>
//                           )}
//                           {request.decision_note && (
//                             <div className="connector-request-comment">
//                               Note: {request.decision_note}
//                             </div>
//                           )}
//                           {request.status === 'PENDING' && (
//                             <div className="connector-request-actions">
//                               <button
//                                 type="button"
//                                 className="request-grant-btn"
//                                 onClick={() => handleConnectorRequestDecision(request, 'grant')}
//                                 disabled={requestBusyId === request.id}
//                               >
//                                 Grant
//                               </button>
//                               <button
//                                 type="button"
//                                 className="request-decline-btn"
//                                 onClick={() => handleConnectorRequestDecision(request, 'decline')}
//                                 disabled={requestBusyId === request.id}
//                               >
//                                 Decline
//                               </button>
//                             </div>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           )}
//         </section>
//       )}
//     </div>
//   );
// }

// function CompanyForm({ setCompanies, token, connectorCatalog = [], onSuccess }) {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [fullName, setFullName] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [prebuiltConnectorIds, setPrebuiltConnectorIds] = useState(new Set());
//   const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
//   const [selectedPrebuiltConns, setSelectedPrebuiltConns] = useState(new Set());
//   const [connectorSearch, setConnectorSearch] = useState('');
//   const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
//   const [connectorSort, setConnectorSort] = useState('asc');

//   const prebuiltCatalog = useMemo(
//     () => connectorCatalog.filter((connector) => prebuiltConnectorIds.has(connector.id)),
//     [connectorCatalog, prebuiltConnectorIds],
//   );
//   const marketplaceCatalog = useMemo(
//     () => connectorCatalog.filter((connector) => !prebuiltConnectorIds.has(connector.id)),
//     [connectorCatalog, prebuiltConnectorIds],
//   );
//   const connectorTypeOptions = useMemo(() => {
//     const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
//     return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
//   }, [connectorCatalog]);
//   const filteredPrebuiltCatalog = useMemo(
//     () =>
//       sortConnectorsByName(
//         prebuiltCatalog.filter((connector) =>
//           connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
//         ),
//         connectorSort,
//       ),
//     [prebuiltCatalog, connectorSearch, connectorTypeFilter, connectorSort],
//   );
//   const filteredMarketplaceCatalog = useMemo(
//     () =>
//       sortConnectorsByName(
//         marketplaceCatalog.filter((connector) =>
//           connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
//         ),
//         connectorSort,
//       ),
//     [marketplaceCatalog, connectorSearch, connectorTypeFilter, connectorSort],
//   );

//   function toggleMarketSelection(id) {
//     setSelectedMarketConns((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   }

//   function togglePrebuiltSelection(id) {
//     setSelectedPrebuiltConns((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   }

//   function purchaseSelected() {
//     setPrebuiltConnectorIds((prev) => {
//       const next = new Set(prev);
//       selectedMarketConns.forEach((id) => next.add(id));
//       return next;
//     });
//     setSelectedMarketConns(new Set());
//   }

//   function moveSelectedToMarketplace() {
//     setPrebuiltConnectorIds((prev) => {
//       const next = new Set(prev);
//       selectedPrebuiltConns.forEach((id) => next.delete(id));
//       return next;
//     });
//     setSelectedPrebuiltConns(new Set());
//   }

//   function selectAllFilteredMarketplace() {
//     setSelectedMarketConns((prev) => {
//       const next = new Set(prev);
//       filteredMarketplaceCatalog.forEach((connector) => next.add(connector.id));
//       return next;
//     });
//   }

//   function clearMarketplaceSelection() {
//     setSelectedMarketConns(new Set());
//   }

//   function selectAllFilteredPrebuilt() {
//     setSelectedPrebuiltConns((prev) => {
//       const next = new Set(prev);
//       filteredPrebuiltCatalog.forEach((connector) => next.add(connector.id));
//       return next;
//     });
//   }

//   function clearPrebuiltSelection() {
//     setSelectedPrebuiltConns(new Set());
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError('');

//     try {
//       const body = {
//         name,
//         admin_email: email,
//         admin_full_name: fullName,
//         admin_password: password,
//         connectors: Array.from(prebuiltConnectorIds),
//       };

//       const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(body),
//       });
//       if (!res.ok) {
//         throw new Error(extractErrorMessage(await res.text(), 'Failed to create company'));
//       }

//       const data = await res.json();
//       const listRes = await fetch(`${API_BASE_URL}/superadmin/companies`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!listRes.ok) {
//         throw new Error(extractErrorMessage(await listRes.text(), 'Failed to refresh company list'));
//       }
//       const comps = await listRes.json();

//       setCompanies(comps);
//       setName('');
//       setEmail('');
//       setFullName('');
//       setPassword('');
//       setPrebuiltConnectorIds(new Set());
//       setSelectedMarketConns(new Set());
//       setSelectedPrebuiltConns(new Set());
//       setConnectorSearch('');
//       setConnectorTypeFilter('ALL');
//       setConnectorSort('asc');
//       if (onSuccess) onSuccess(data.tenant_id);
//     } catch (err) {
//       console.error(err);
//       setError('Unable to create company.');
//     }
//   }

//   return (
//     <form className="company-create-form" onSubmit={handleSubmit}>
//       <div className="company-form-fields">
//         <div className="field">
//           <label>
//             Company Name
//             <input
//               placeholder="company name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               required
//             />
//           </label>
//         </div>
//         <div className="field">
//           <label>
//             Admin Email
//             <input
//               placeholder="admin email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </label>
//         </div>
//         <div className="field">
//           <label>
//             Admin Full Name
//             <input
//               placeholder="admin full name"
//               value={fullName}
//               onChange={(e) => setFullName(e.target.value)}
//               required
//             />
//           </label>
//         </div>
//         <div className="field">
//           <label>
//             Admin Password
//             <input
//               placeholder="admin password"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </label>
//         </div>
//       </div>

//       <div className="company-form-connectors">
//         <h3 className="connector-manager-title">Connectors</h3>
//         <p className="admin-subtext">
//           Move connectors between Marketplace and Prebuilt before creating the company.
//         </p>
//         <div className="connector-toolbar">
//           <label>
//             Search
//             <input
//               type="search"
//               placeholder="Search by connector name, type, or id"
//               value={connectorSearch}
//               onChange={(e) => setConnectorSearch(e.target.value)}
//             />
//           </label>
//           <label>
//             Type
//             <select value={connectorTypeFilter} onChange={(e) => setConnectorTypeFilter(e.target.value)}>
//               {connectorTypeOptions.map((type) => (
//                 <option key={type} value={type}>
//                   {type === 'ALL' ? 'All Types' : type}
//                 </option>
//               ))}
//             </select>
//           </label>
//           <label>
//             Sort
//             <select value={connectorSort} onChange={(e) => setConnectorSort(e.target.value)}>
//               <option value="asc">A → Z</option>
//               <option value="desc">Z → A</option>
//             </select>
//           </label>
//         </div>

//         <div className="connector-grid-layout">
//           <div className="connector-card-panel">
//             <div className="connector-panel-head">
//               <h3>Prebuilt ({filteredPrebuiltCatalog.length})</h3>
//               <div className="connector-panel-actions">
//                 <button type="button" onClick={selectAllFilteredPrebuilt}>
//                   Select Filtered
//                 </button>
//                 <button type="button" onClick={clearPrebuiltSelection}>
//                   Clear
//                 </button>
//               </div>
//             </div>

//             <div className="connector-card-grid">
//               {filteredPrebuiltCatalog.length === 0 ? (
//                 <div className="connector-empty">No prebuilt connectors selected.</div>
//               ) : (
//                 filteredPrebuiltCatalog.map((connector) => (
//                   <label
//                     key={connector.id}
//                     className={`connector-grid-card ${
//                       selectedPrebuiltConns.has(connector.id) ? 'selected' : ''
//                     }`}
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedPrebuiltConns.has(connector.id)}
//                       onChange={() => togglePrebuiltSelection(connector.id)}
//                     />
//                     <div className="connector-grid-name">{connector.name}</div>
//                     <div className="connector-grid-type">{connector.type}</div>
//                     <div className="connector-grid-id">{connector.id}</div>
//                   </label>
//                 ))
//               )}
//             </div>
//             <button
//               type="button"
//               className="connector-action"
//               onClick={moveSelectedToMarketplace}
//               disabled={selectedPrebuiltConns.size === 0}
//             >
//               Move Selected to Marketplace ({selectedPrebuiltConns.size})
//             </button>
//           </div>

//           <div className="connector-card-panel">
//             <div className="connector-panel-head">
//               <h3>Marketplace ({filteredMarketplaceCatalog.length})</h3>
//               <div className="connector-panel-actions">
//                 <button type="button" onClick={selectAllFilteredMarketplace}>
//                   Select Filtered
//                 </button>
//                 <button type="button" onClick={clearMarketplaceSelection}>
//                   Clear
//                 </button>
//               </div>
//             </div>
//             <div className="connector-card-grid">
//               {filteredMarketplaceCatalog.length === 0 ? (
//                 <div className="connector-empty">No marketplace connectors for this filter.</div>
//               ) : (
//                 filteredMarketplaceCatalog.map((connector) => (
//                   <label
//                     key={connector.id}
//                     className={`connector-grid-card ${
//                       selectedMarketConns.has(connector.id) ? 'selected' : ''
//                     }`}
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedMarketConns.has(connector.id)}
//                       onChange={() => toggleMarketSelection(connector.id)}
//                     />
//                     <div className="connector-grid-name">{connector.name}</div>
//                     <div className="connector-grid-type">{connector.type}</div>
//                     <div className="connector-grid-id">{connector.id}</div>
//                   </label>
//                 ))
//               )}
//             </div>
//             <button
//               type="button"
//               className="connector-action"
//               onClick={purchaseSelected}
//               disabled={selectedMarketConns.size === 0}
//             >
//               Add Selected to Prebuilt ({selectedMarketConns.size})
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="company-form-actions">
//         <button type="submit" className="primary-btn">
//           Create Company
//         </button>
//       </div>
//     </form>
//   );
// }

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '/admin.css';
import CommonSnackbar from '../../common/components/CommonSnackbar';
import { connectorsAdminApi } from '../Integrationlibrary/services/connectors/admin.api';
import { connectorsSuperadminApi } from '../Integrationlibrary/services/connectors/superadmin.api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || '';

function extractErrorMessage(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed.detail || fallback;
  } catch {
    return raw || fallback;
  }
}

function decodeTokenPayload(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizeText(value = '') {
  return String(value).toLowerCase().trim();
}

function connectorMatchesFilters(connector, query, typeFilter) {
  const normalizedQuery = normalizeText(query);
  const normalizedTypeFilter = normalizeText(typeFilter);
  const byType =
    normalizedTypeFilter === 'all' || normalizeText(connector.type) === normalizedTypeFilter;
  if (!byType) return false;
  if (!normalizedQuery) return true;

  return (
    normalizeText(connector.name).includes(normalizedQuery) ||
    normalizeText(connector.type).includes(normalizedQuery) ||
    normalizeText(connector.id).includes(normalizedQuery)
  );
}

function sortConnectorsByName(items, sortOrder) {
  const direction = sortOrder === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aName = String(a.name || '');
    const bName = String(b.name || '');
    return aName.localeCompare(bName) * direction;
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function csvEscape(value) {
  const safe = String(value ?? '');
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function downloadCsv(filename, headers, rows) {
  const csvLines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
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
  const [connectorSubTab, setConnectorSubTab] = useState('connectors');
  const [connectorSearch, setConnectorSearch] = useState('');
  const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
  const [connectorSort, setConnectorSort] = useState('asc');
  const [connectorDensity, setConnectorDensity] = useState('cozy');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationStatusFilter, setNotificationStatusFilter] = useState('ALL');
  const [notificationSort, setNotificationSort] = useState('newest');
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const token = localStorage.getItem('connectx_token');
  const tenantFromStorage = localStorage.getItem('connectx_tenant_id') || '';
  const tenantFromToken = decodeTokenPayload(token)?.tenant_id || '';
  const effectiveTenantId = tenantFromToken || tenantFromStorage || TENANT_ID;
  const selectedCompany = companies.find((c) => c.id === selectedTenant) || null;
  const currentTenant = isSuper
    ? viewMode === 'detail'
      ? selectedTenant
      : ''
    : effectiveTenantId;

  const catalogById = useMemo(
    () => new Map(connectorCatalog.map((connector) => [connector.id, connector])),
    [connectorCatalog],
  );
  const purchasedCatalog = useMemo(
    () =>
      Array.from(purchasedConnectorIds).map((connectorId) => {
        const fromCatalog = catalogById.get(connectorId);
        const fallback = purchasedConnectorMeta.get(connectorId);
        if (fromCatalog) {
          return {
            ...fromCatalog,
            status: fallback?.status || fromCatalog?.status || 'IN_PROGRESS',
          };
        }
        return {
          id: connectorId,
          name: fallback?.name || connectorId,
          type: fallback?.type || 'Unknown',
          status: fallback?.status || 'IN_PROGRESS',
        };
      }),
    [catalogById, purchasedConnectorIds, purchasedConnectorMeta],
  );
  const marketplaceCatalog = useMemo(
    () => connectorCatalog.filter((connector) => !purchasedConnectorIds.has(connector.id)),
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
    const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredCatalog = useMemo(
    () =>
      sortConnectorsByName(
        connectorCatalog.filter((connector) =>
          connectorMatchesFilters(connector, catalogSearch, catalogTypeFilter),
        ),
        catalogSort,
      ),
    [connectorCatalog, catalogSearch, catalogTypeFilter, catalogSort],
  );
  const connectorTypeOptions = useMemo(() => {
    const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredPurchasedCatalog = useMemo(
    () =>
      sortConnectorsByName(
        purchasedCatalog.filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [purchasedCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const filteredMarketplaceCatalog = useMemo(
    () =>
      sortConnectorsByName(
        marketplaceCatalog.filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [marketplaceCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const pendingConnectorRequests = useMemo(
    () => connectorRequests.filter((request) => request.status === 'PENDING'),
    [connectorRequests],
  );
  const filteredConnectorRequests = useMemo(() => {
    const query = normalizeText(notificationSearch);
    const filtered = connectorRequests.filter((request) => {
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
    const rows = await connectorsSuperadminApi.getCatalog(token);
    return rows.map((row) => ({
      id: row.connector_id,
      name: row.name,
      type: row.type || 'Unknown',
      logo_url: row.logo_url || '',
      version_name: row.version_name || '',
    }));
  }

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
          setSelectedTenant(effectiveTenantId || '');
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

  useEffect(() => {
    setCompanyNameDraft(selectedCompany?.name || '');
  }, [selectedTenant, selectedCompany?.name]);

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
        const [usersRes, connectorsData, requestsData, purchasedRows] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/${currentTenant}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          connectorsAdminApi.getTenantConnectors(currentTenant, token),
          connectorsAdminApi.getTenantConnectorRequests(currentTenant, token).catch(() => []),
          connectorsAdminApi.getTenantPurchasedConnectors(currentTenant, token).catch(() => []),
        ]);

        if (!usersRes.ok) {
          throw new Error(extractErrorMessage(await usersRes.text(), 'Failed to load users'));
        }
        const usersData = await usersRes.json();
        if (cancelled) return;

        setUsers(usersData);
        const purchasedIds = new Set();
        const purchasedMeta = new Map();
        const statusByConnector = new Map(
          (Array.isArray(purchasedRows) ? purchasedRows : []).map((row) => [
            String(row.connector_id || row.name || '').trim(),
            String(row.status || '').toUpperCase() || 'IN_PROGRESS',
          ]),
        );
        connectorsData.forEach((connector) => {
          const rawId = (connector.connector_id || connector.name || '').trim();
          if (!rawId) return;
          purchasedIds.add(rawId);
          purchasedMeta.set(rawId, {
            name: connector.name || rawId,
            type: connector.category || connector.type || 'Unknown',
            status: statusByConnector.get(rawId) || 'IN_PROGRESS',
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

  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      setError('');
    }
  }, [error]);

  useEffect(() => {
    if (info) {
      setSnackbar({ open: true, message: info, severity: 'success' });
      setInfo('');
    }
  }, [info]);

  function closeSnackbar() {
    setSnackbar(prev => ({ ...prev, open: false }));
  }

  function openCompany(companyId) {
    navigate(`/admin/company/${companyId}`);
  }

  function backToCompanies() {
    setError('');
    setInfo('');
    setEditingUser(null);
    setConnectorSubTab('connectors');
    setSelectedRequestIds(new Set());
    setViewMode('companies');
  }

  function backToLanding() {
    navigate('/');
  }

  function refreshTenantData() {
    if (!currentTenant) return;
    setRefreshNonce((prev) => prev + 1);
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

  async function purchaseSelectedConnectors() {
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
          await connectorsAdminApi.addTenantConnector(currentTenant, token, {
              connector_id: connectorId,
              name: connector?.name || connectorId,
              category: connector?.type || '',
              type: 'prebuilt',
              logo_url: connector?.logo_url || connector?.logoUrl || '',
              external_url: connector?.url || '',
          });
        }),
      );

      setPurchasedConnectorIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setPurchasedConnectorMeta((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => {
          const connector = catalogById.get(id);
          next.set(id, {
            name: connector?.name || id,
            type: connector?.type || 'Unknown',
            status: 'IN_PROGRESS',
          });
        });
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
  }

  async function moveSelectedToMarketplace() {
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
          try {
            await connectorsAdminApi.deleteTenantConnector(currentTenant, connectorId, token);
          } catch (err) {
            if (!String(err?.message || '').toLowerCase().includes('not found')) {
              throw err;
            }
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
  }

  async function handleConnectorRequestDecision(request, action) {
    if (!isSuper) return;
    if (!request?.id) return;

    setError('');
    setInfo('');
    setRequestBusyId(request.id);
    try {
      const mappedAction = action === 'grant' ? 'approve' : action === 'deny' ? 'decline' : action;
      const payload = { action: mappedAction };
      if (action === 'grant') {
        const url = window.prompt('Optional access URL to provide to tenant (leave blank if none):');
        if (url) payload.reason = url;
      }
      const updated = await connectorsSuperadminApi.decideRequest(request.id, token, payload);
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
            status: 'IN_PROGRESS',
          });
          return next;
        });
      }
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

  async function handleBulkConnectorRequestDecision(action) {
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
      await handleConnectorRequestDecision(request, action);
    }
    setSelectedRequestIds(new Set());
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!currentTenant) return;

    setError('');
    setInfo('');
    try {
      const params = new URLSearchParams();
      params.append('email', form.email);
      params.append('full_name', form.fullName);
      params.append('password', form.password);

      const res = await fetch(
        `${API_BASE_URL}/admin/${currentTenant}/users?${params.toString()}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const detail = extractErrorMessage(await res.text(), 'Failed to create user');
        if (detail?.toLowerCase().includes('tenant already has an admin')) {
          setError(detail);
          return;
        }
        throw new Error(detail);
      }

      const created = await res.json();
      setUsers((prev) => [...prev, created]);
      setForm({ email: '', fullName: '', password: '' });
      if (created.role === 'ADMIN') {
        setInfo('Tenant had no admin; this user was promoted to ADMIN.');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to create user.');
    }
  }

  function startEdit(user) {
    setEditingUser(user.id);
    setEditForm({ fullName: user.full_name || '', password: '' });
  }

  function cancelEdit() {
    setEditingUser(null);
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser || !currentTenant) return;

    setError('');
    try {
      if (editForm.fullName) {
        const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${editingUser}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ full_name: editForm.fullName }),
        });
        if (!res.ok) {
          throw new Error(extractErrorMessage(await res.text(), 'Failed to update user'));
        }
      }

      if (editForm.password) {
        const res2 = await fetch(
          `${API_BASE_URL}/admin/${currentTenant}/users/${editingUser}/password`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ new_password: editForm.password }),
          },
        );
        if (!res2.ok) {
          throw new Error(extractErrorMessage(await res2.text(), 'Failed to change password'));
        }
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser ? { ...u, full_name: editForm.fullName } : u)),
      );
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      setError('Unable to update user.');
    }
  }

  async function handleDeleteUser(userId) {
    if (!currentTenant) return;

    const target = users.find((u) => u.id === userId);
    if (target?.role === 'ADMIN' && !isSuper) {
      setError('Company admin cannot be deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to delete user'));
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (editingUser === userId) setEditingUser(null);
    } catch (err) {
      console.error(err);
      setError('Unable to delete user.');
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: '#0f172a' }}>Loading admin page…</div>;
  }

  if (forbidden) {
    return <div style={{ padding: 24, color: '#0f172a' }}>You are not an admin for this tenant.</div>;
  }

  return (
    <div className={`admin-container ${isSuper ? 'superadmin-theme' : 'admin-theme'}`}>
      <CommonSnackbar
        open={snackbar.open}
        onClose={closeSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
        position={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiAlert-root': {
            width: '100%',
            maxWidth: '100%',
            borderRadius: 0,
          },
          '& .MuiSnackbar-root': {
            left: '0 !important',
            right: '0 !important',
            transform: 'none !important',
            width: '100%',
          }
        }}
      />

      {isSuper && viewMode === 'companies' && (
        <section className="companies-home">
          <div className="companies-home-header">
            <div>
              <h1 className="admin-header">Companies</h1>
              <p className="admin-subtext">
                Select a company to manage admin details, users, and connectors.
              </p>
            </div>
            <div className="companies-home-actions">
              <button type="button" className="secondary-btn" onClick={backToLanding}>
                Back to Main Landing
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowCompanyForm((prev) => !prev)}
              >
                Create Company
              </button>
            </div>
          {isSuper && oauthUsers.length > 0 && (
            <div className="oauth-users-panel">
              <h2>External Users</h2>
              <ul>
                {oauthUsers.map((u) => (
                  <li key={u.id}>{u.email} ({u.auth_provider})</li>
                ))}
              </ul>
            </div>
          )}
          </div>

          <div className="companies-toolbar">
            <label>
              Search Company
              <input
                type="search"
                placeholder="Search by company name or tenant id"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
            </label>
            <div className="companies-count-pill">
              Showing {filteredCompanies.length} / {companies.length}
            </div>
          </div>

          {showCompanyForm && (
            <div className="company-form-card">
              <CompanyForm
                setCompanies={setCompanies}
                token={token}
                connectorCatalog={connectorCatalog}
                onSuccess={(tenantId) => {
                  setShowCompanyForm(false);
                  setSelectedTenant(tenantId);
                  setInfo('Company created. Click the company card to open details.');
                }}
              />
            </div>
          )}

          {companies.length === 0 ? (
            <div className="empty-state">No companies exist. Create a company to get started.</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="empty-state">No company matches the current search.</div>
          ) : (
            <div className="company-cards-grid">
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="company-card"
                  onClick={() => openCompany(company.id)}
                >
                  <div className="company-card-title">{company.name}</div>
                  <div className="company-card-meta">{company.id}</div>
                </button>
              ))}
            </div>
          )}

          <div className="catalog-table-section">
            <h2 className="connector-manager-title">Prebuilt Connector Catalog</h2>
            <p className="admin-subtext">
              Source of truth loaded from the latest connector workbook.
            </p>
            <div className="catalog-toolbar">
              <label>
                Search Catalog
                <input
                  type="search"
                  placeholder="Search by connector name, type, or id"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </label>
              <label>
                Type
                <select
                  value={catalogTypeFilter}
                  onChange={(e) => setCatalogTypeFilter(e.target.value)}
                >
                  {catalogTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type === 'ALL' ? 'All Types' : type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort
                <select value={catalogSort} onChange={(e) => setCatalogSort(e.target.value)}>
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </label>
              <div className="catalog-count-pill">
                {filteredCatalog.length} of {connectorCatalog.length}
              </div>
            </div>

            <div className="catalog-grid">
              {filteredCatalog.map((connector) => (
                <article key={connector.id} className="catalog-card">
                  <h3>{connector.name}</h3>
                  <span className="catalog-card-type">{connector.type}</span>
                  <code>{connector.id}</code>
                </article>
              ))}
              {connectorCatalog.length === 0 && (
                <div className="empty-state">No connector catalog data available.</div>
              )}
              {connectorCatalog.length > 0 && filteredCatalog.length === 0 && (
                <div className="empty-state">No connectors match the current catalog filter.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {(!isSuper || viewMode === 'detail') && (
        <section className="company-detail-page">
          <div className="detail-nav-row">
            {isSuper && (
              <button type="button" className="back-btn" onClick={backToCompanies}>
                ← Back to Companies
              </button>
            )}
            <button type="button" className="back-btn" onClick={backToLanding}>
              ← Back to Main Landing
            </button>
          </div>

          <div className="detail-header">
            <h1 className="admin-header">{selectedCompany?.name || 'Tenant'}</h1>
            <p className="admin-subtext">
              Tenant ID: <code>{currentTenant}</code>
            </p>
            <div className="tenant-utility-row">
              <button type="button" className="secondary-btn" onClick={copyTenantId}>
                Copy Tenant ID
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={refreshTenantData}
                disabled={tenantLoading || connectorLoading}
              >
                Refresh Data
              </button>
              {/* <span className="tenant-refresh-meta">
                Last refreshed: {formatDateTime(lastRefreshedAt)}
              </span> */}
            </div>
          </div>

          <div className="detail-tabs" style={{ borderBottomColor: 'var(--border)' }}>
            <button
              type="button"
              className={`detail-tab ${detailTab === 'admin' ? 'active' : ''}`}
              onClick={() => setDetailTab('admin')}
              onMouseEnter={(e) => {
                if (detailTab !== 'admin') {
                  e.target.style.backgroundColor = 'var(--brand-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (detailTab !== 'admin') {
                  e.target.style.backgroundColor = 'var(--bg-card)';
                }
              }}
              style={{
                borderColor: detailTab === 'admin' ? 'transparent' : 'var(--border)',
                color: detailTab === 'admin' ? '#ffffff' : 'var(--text-primary)',
                backgroundColor: detailTab === 'admin' ? 'var(--brand-primary)' : 'var(--bg-card)',
                transition: 'all 0.2s ease'
              }}
            >
              Admin Details
            </button>
            <button
              type="button"
              className={`detail-tab ${detailTab === 'users' ? 'active' : ''}`}
              onClick={() => setDetailTab('users')}
              onMouseEnter={(e) => {
                if (detailTab !== 'users') {
                  e.target.style.backgroundColor = 'var(--brand-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (detailTab !== 'users') {
                  e.target.style.backgroundColor = 'var(--bg-card)';
                }
              }}
              style={{
                borderColor: detailTab === 'users' ? 'transparent' : 'var(--border)',
                color: detailTab === 'users' ? '#ffffff' : 'var(--text-primary)',
                backgroundColor: detailTab === 'users' ? 'var(--brand-primary)' : 'var(--bg-card)',
                transition: 'all 0.2s ease'
              }}
            >
              Users
            </button>
            {isSuper && (
              <button
                type="button"
                className={`detail-tab ${detailTab === 'connectors' ? 'active' : ''}`}
                onClick={() => setDetailTab('connectors')}
                onMouseEnter={(e) => {
                  if (detailTab !== 'connectors') {
                    e.target.style.backgroundColor = 'var(--brand-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (detailTab !== 'connectors') {
                    e.target.style.backgroundColor = 'var(--bg-card)';
                  }
                }}
                style={{
                  borderColor: detailTab === 'connectors' ? 'transparent' : 'var(--border)',
                  color: detailTab === 'connectors' ? '#ffffff' : 'var(--text-primary)',
                  backgroundColor: detailTab === 'connectors' ? 'var(--brand-primary)' : 'var(--bg-card)',
                  transition: 'all 0.2s ease'
                }}
              >
                Connectors
              </button>
            )}
          </div>

          {detailTab === 'admin' && (
            <div className="detail-panel">
              {isSuper && (
                <>
                  <div className="company-edit-row">
                    <label>
                      Company name
                      <input
                        value={companyNameDraft}
                        onChange={(e) => setCompanyNameDraft(e.target.value)}
                        placeholder="Company name"
                      />
                    </label>
                    <button type="button" className="primary-btn" onClick={handleRenameCompany}>
                      Save Name
                    </button>
                  </div>

                  <div className="company-actions-row">
                    <button type="button" className="danger-btn" onClick={handleDeleteCompany}>
                      Delete Company
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleRemoveAdmin}
                      disabled={!adminUser}
                    >
                      Remove Admin
                    </button>
                  </div>
                </>
              )}

              <div className="admin-summary-grid">
                <div className="summary-card">
                  <h3>Admin Account</h3>
                  {adminUser ? (
                    <>
                      <p><strong>Email:</strong> {adminUser.email}</p>
                      <p><strong>Name:</strong> {adminUser.full_name || '-'}</p>
                    </>
                  ) : (
                    <p>No admin assigned.</p>
                  )}
                </div>
                <div className="summary-card">
                  <h3>User Summary</h3>
                  <p><strong>Total users:</strong> {users.length}</p>
                  <p>
                    <strong>Members:</strong>{' '}
                    {users.filter((user) => user.role !== 'ADMIN').length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'users' && (
            <div className="detail-panel">
              {tenantLoading ? (
                <p className="admin-subtext">Loading users…</p>
              ) : (
                <>
                  <h2 className="connector-manager-title">Tenant Users</h2>
                  <p className="admin-subtext">
                    {!adminUser
                      ? 'Create the administrator for this tenant:'
                      : 'Create a member for this tenant:'}
                  </p>

                  <form onSubmit={handleCreateUser} className="admin-form">
                    <div className="field">
                      <label>
                        Email
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Full name
                        <input
                          type="text"
                          required
                          value={form.fullName}
                          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="field">
                      <label>
                        Password
                        <input
                          type="password"
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                      </label>
                    </div>
                    <button type="submit">Add User</button>
                  </form>

                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>
                            {editingUser === user.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editForm.fullName}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, fullName: e.target.value })
                                  }
                                  style={{ width: '100%', padding: 4, marginBottom: 4 }}
                                  placeholder="Full name"
                                />
                                <input
                                  type="password"
                                  value={editForm.password || ''}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, password: e.target.value })
                                  }
                                  style={{ width: '100%', padding: 4 }}
                                  placeholder="New password (leave blank)"
                                />
                              </>
                            ) : (
                              user.full_name
                            )}
                          </td>
                          <td>{user.role}</td>
                          <td>{user.created_at ? new Date(user.created_at).toLocaleString() : ''}</td>
                          <td className="admin-actions">
                            {editingUser === user.id ? (
                              <>
                                <button onClick={handleUpdateUser}>Save</button>
                                <button onClick={cancelEdit}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(user)}>Edit</button>
                                {user.role === 'ADMIN' && !isSuper ? (
                                  <button
                                    type="button"
                                    disabled
                                    title="Company admin cannot be deleted"
                                  >
                                    Protected
                                  </button>
                                ) : (
                                  <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {isSuper && detailTab === 'connectors' && (
            <div className="detail-panel connectors-panel">
              <div className="connectors-panel-head">
                <div>
                  <h2 className="connector-manager-title">Connector Governance</h2>
                  <p className="admin-subtext">
                    Manage tenant prebuilt entitlements, marketplace inventory, and approval activity.
                  </p>
                </div>
                <div className="connector-kpi-grid">
                  <div className="connector-kpi-card">
                    <span>Prebuilt</span>
                    <strong>{purchasedCatalog.length}</strong>
                  </div>
                  <div className="connector-kpi-card">
                    <span>Marketplace</span>
                    <strong>{marketplaceCatalog.length}</strong>
                  </div>
                  <div className="connector-kpi-card">
                    <span>Pending</span>
                    <strong>{pendingConnectorRequests.length}</strong>
                  </div>
                </div>
              </div>

              <div className="connector-subtabs">
                <button
                  type="button"
                  className={`connector-subtab ${connectorSubTab === 'connectors' ? 'active' : ''}`}
                  onClick={() => setConnectorSubTab('connectors')}
                >
                  Connector Section
                </button>
                <button
                  type="button"
                  className={`connector-subtab ${connectorSubTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setConnectorSubTab('notifications')}
                >
                  Notifications ({pendingConnectorRequests.length})
                </button>
              </div>

              {connectorLoading ? (
                <div className="admin-subtext">Loading connectors…</div>
              ) : connectorSubTab === 'connectors' ? (
                <>
                  <div className="connector-toolbar">
                    <label>
                      Search
                      <input
                        type="search"
                        placeholder="Search by connector name, type, or id"
                        value={connectorSearch}
                        onChange={(e) => setConnectorSearch(e.target.value)}
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={connectorTypeFilter}
                        onChange={(e) => setConnectorTypeFilter(e.target.value)}
                      >
                        {connectorTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type === 'ALL' ? 'All Types' : type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sort
                      <select
                        value={connectorSort}
                        onChange={(e) => setConnectorSort(e.target.value)}
                      >
                        <option value="asc">A → Z</option>
                        <option value="desc">Z → A</option>
                      </select>
                    </label>
                    <label>
                      Density
                      <select
                        value={connectorDensity}
                        onChange={(e) => setConnectorDensity(e.target.value)}
                      >
                        <option value="cozy">Cozy</option>
                        <option value="compact">Compact</option>
                      </select>
                    </label>
                  </div>
                  <div className="connector-toolbar-actions">
                    <button type="button" className="secondary-btn" onClick={exportConnectorSnapshot}>
                      Export Connectors CSV
                    </button>
                  </div>

                  <div className={`connector-grid-layout ${connectorDensity === 'compact' ? 'compact' : 'cozy'}`}>
                    <section className="connector-card-panel">
                      <div className="connector-panel-head">
                        <h3>Prebuilt ({filteredPurchasedCatalog.length})</h3>
                        <div className="connector-panel-actions">
                          <button type="button" onClick={selectAllFilteredPrebuilt}>
                            Select Filtered
                          </button>
                          <button type="button" onClick={clearPrebuiltSelection}>
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="connector-card-grid">
                        {filteredPurchasedCatalog.length === 0 ? (
                          <div className="connector-empty">No prebuilt connectors for this filter.</div>
                        ) : (
                          filteredPurchasedCatalog.map((connector) => (
                            <label
                              key={connector.id}
                              className={`connector-grid-card ${
                                selectedPurchasedConns.has(connector.id) ? 'selected' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPurchasedConns.has(connector.id)}
                                onChange={() => togglePurchasedSelection(connector.id)}
                                disabled={connectorBusy}
                              />
                              <div className="connector-grid-name">{connector.name}</div>
                              <div className="connector-grid-type">{connector.type}</div>
                              <div className="connector-grid-id">{connector.id}</div>
                            </label>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        className="connector-action"
                        onClick={moveSelectedToMarketplace}
                        disabled={connectorBusy || selectedPurchasedConns.size === 0}
                      >
                        Move Selected to Marketplace ({selectedPurchasedConns.size})
                      </button>
                    </section>

                    <section className="connector-card-panel">
                      <div className="connector-panel-head">
                        <h3>Marketplace ({filteredMarketplaceCatalog.length})</h3>
                        <div className="connector-panel-actions">
                          <button type="button" onClick={selectAllFilteredMarketplace}>
                            Select Filtered
                          </button>
                          <button type="button" onClick={clearMarketplaceSelection}>
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="connector-card-grid">
                        {filteredMarketplaceCatalog.length === 0 ? (
                          <div className="connector-empty">No marketplace connectors for this filter.</div>
                        ) : (
                          filteredMarketplaceCatalog.map((connector) => (
                            <label
                              key={connector.id}
                              className={`connector-grid-card ${
                                selectedMarketConns.has(connector.id) ? 'selected' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedMarketConns.has(connector.id)}
                                onChange={() => toggleMarketplaceSelection(connector.id)}
                                disabled={connectorBusy}
                              />
                              <div className="connector-grid-name">{connector.name}</div>
                              <div className="connector-grid-type">{connector.type}</div>
                              <div className="connector-grid-id">{connector.id}</div>
                            </label>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        className="connector-action"
                        onClick={purchaseSelectedConnectors}
                        disabled={connectorBusy || selectedMarketConns.size === 0}
                      >
                        Add Selected to Prebuilt ({selectedMarketConns.size})
                      </button>
                    </section>
                  </div>
                </>
              ) : (
                <>
                  <div className="notification-toolbar">
                    <label>
                      Search Requests
                      <input
                        type="search"
                        placeholder="Search requester, connector, status, comments"
                        value={notificationSearch}
                        onChange={(e) => setNotificationSearch(e.target.value)}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={notificationStatusFilter}
                        onChange={(e) => setNotificationStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All</option>
                        <option value="PENDING">Pending</option>
                        <option value="GRANTED">Granted</option>
                        <option value="DECLINED">Declined</option>
                      </select>
                    </label>
                    <label>
                      Sort
                      <select
                        value={notificationSort}
                        onChange={(e) => setNotificationSort(e.target.value)}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="sla">SLA Priority</option>
                      </select>
                    </label>
                  </div>
                  <div className="notification-toolbar-actions">
                    <button type="button" className="secondary-btn" onClick={selectAllPendingRequests}>
                      Select Pending
                    </button>
                    <button type="button" className="secondary-btn" onClick={clearSelectedRequests}>
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => handleBulkConnectorRequestDecision('grant')}
                      disabled={selectedRequestIds.size === 0}
                    >
                      Grant Selected ({selectedRequestIds.size})
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleBulkConnectorRequestDecision('decline')}
                      disabled={selectedRequestIds.size === 0}
                    >
                      Decline Selected ({selectedRequestIds.size})
                    </button>
                    <button type="button" className="secondary-btn" onClick={exportRequestsSnapshot}>
                      Export Requests CSV
                    </button>
                  </div>
                  {filteredConnectorRequests.length === 0 ? (
                    <div className="connector-empty">No connector request notifications found.</div>
                  ) : (
                    <div className="request-card-grid">
                      {filteredConnectorRequests.map((request) => (
                        <div key={request.id} className="connector-request-item">
                          {request.status === 'PENDING' && (
                            <label className="request-select-control">
                              <input
                                type="checkbox"
                                checked={selectedRequestIds.has(request.id)}
                                onChange={() => toggleRequestSelection(request.id)}
                              />
                              Select for bulk action
                            </label>
                          )}
                          <div className="connector-request-head">
                            <div className="connector-request-title">
                              {request.connector_name || request.connector_id}
                            </div>
                            <span className="connector-request-type">
                              {request.connector_type || 'Unknown'}
                            </span>
                          </div>

                          <div className={`connector-request-status status-${String(request.status || '').toLowerCase()}`}>
                            {request.status}
                          </div>

                          {(request.requested_by_name || request.requested_by_email) && (
                            <div className="connector-request-meta">
                              Requested by {request.requested_by_name || request.requested_by_email}
                            </div>
                          )}
                          {request.request_comment && (
                            <div className="connector-request-comment">
                              Comment: {request.request_comment}
                            </div>
                          )}
                          {request.attachment_url && (
                            <a
                              className="connector-request-attachment"
                              href={request.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Attachment: {request.attachment_name || 'Open attachment'}
                            </a>
                          )}
                          {request.granted_access_url && (
                            <div className="connector-request-link">
                              Access URL: <span className="link-val">{request.granted_access_url}</span>{' '}
                              <button
                                type="button"
                                className="copy-link-btn"
                                onClick={() => navigator.clipboard.writeText(request.granted_access_url)}
                              >
                                Copy
                              </button>
                            </div>
                          )}
                          {request.sla_state && request.status === 'PENDING' && (
                            <div
                              className={`connector-request-sla sla-${String(request.sla_state || '').toLowerCase()}`}
                            >
                              SLA: {request.sla_state}
                            </div>
                          )}

                          <div className="connector-request-time">
                            Requested:{' '}
                            {request.created_at
                              ? new Date(request.created_at).toLocaleString()
                              : '-'}
                          </div>
                          {request.decided_at && (
                            <div className="connector-request-time">
                              Decision: {new Date(request.decided_at).toLocaleString()}
                            </div>
                          )}
                          {request.decision_note && (
                            <div className="connector-request-comment">
                              Note: {request.decision_note}
                            </div>
                          )}
                          {request.status === 'PENDING' && (
                            <div className="connector-request-actions">
                              <button
                                type="button"
                                className="request-grant-btn"
                                onClick={() => handleConnectorRequestDecision(request, 'grant')}
                                disabled={requestBusyId === request.id}
                              >
                                Grant
                              </button>
                              <button
                                type="button"
                                className="request-decline-btn"
                                onClick={() => handleConnectorRequestDecision(request, 'decline')}
                                disabled={requestBusyId === request.id}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CompanyForm({ setCompanies, token, connectorCatalog = [], onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [prebuiltConnectorIds, setPrebuiltConnectorIds] = useState(new Set());
  const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
  const [selectedPrebuiltConns, setSelectedPrebuiltConns] = useState(new Set());
  const [connectorSearch, setConnectorSearch] = useState('');
  const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
  const [connectorSort, setConnectorSort] = useState('asc');

  const prebuiltCatalog = useMemo(
    () => connectorCatalog.filter((connector) => prebuiltConnectorIds.has(connector.id)),
    [connectorCatalog, prebuiltConnectorIds],
  );
  const marketplaceCatalog = useMemo(
    () => connectorCatalog.filter((connector) => !prebuiltConnectorIds.has(connector.id)),
    [connectorCatalog, prebuiltConnectorIds],
  );
  const connectorTypeOptions = useMemo(() => {
    const options = new Set(connectorCatalog.map((connector) => connector.type || 'Unknown'));
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredPrebuiltCatalog = useMemo(
    () =>
      sortConnectorsByName(
        prebuiltCatalog.filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [prebuiltCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const filteredMarketplaceCatalog = useMemo(
    () =>
      sortConnectorsByName(
        marketplaceCatalog.filter((connector) =>
          connectorMatchesFilters(connector, connectorSearch, connectorTypeFilter),
        ),
        connectorSort,
      ),
    [marketplaceCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );

  function toggleMarketSelection(id) {
    setSelectedMarketConns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePrebuiltSelection(id) {
    setSelectedPrebuiltConns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function purchaseSelected() {
    setPrebuiltConnectorIds((prev) => {
      const next = new Set(prev);
      selectedMarketConns.forEach((id) => next.add(id));
      return next;
    });
    setSelectedMarketConns(new Set());
  }

  function moveSelectedToMarketplace() {
    setPrebuiltConnectorIds((prev) => {
      const next = new Set(prev);
      selectedPrebuiltConns.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedPrebuiltConns(new Set());
  }

  function selectAllFilteredMarketplace() {
    setSelectedMarketConns((prev) => {
      const next = new Set(prev);
      filteredMarketplaceCatalog.forEach((connector) => next.add(connector.id));
      return next;
    });
  }

  function clearMarketplaceSelection() {
    setSelectedMarketConns(new Set());
  }

  function selectAllFilteredPrebuilt() {
    setSelectedPrebuiltConns((prev) => {
      const next = new Set(prev);
      filteredPrebuiltCatalog.forEach((connector) => next.add(connector.id));
      return next;
    });
  }

  function clearPrebuiltSelection() {
    setSelectedPrebuiltConns(new Set());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const body = {
        name,
        admin_email: email,
        admin_full_name: fullName,
        admin_password: password,
        connectors: Array.from(prebuiltConnectorIds),
      };

      const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to create company'));
      }

      const data = await res.json();
      const listRes = await fetch(`${API_BASE_URL}/superadmin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        throw new Error(extractErrorMessage(await listRes.text(), 'Failed to refresh company list'));
      }
      const comps = await listRes.json();

      setCompanies(comps);
      setName('');
      setEmail('');
      setFullName('');
      setPassword('');
      setPrebuiltConnectorIds(new Set());
      setSelectedMarketConns(new Set());
      setSelectedPrebuiltConns(new Set());
      setConnectorSearch('');
      setConnectorTypeFilter('ALL');
      setConnectorSort('asc');
      if (onSuccess) onSuccess(data.tenant_id);
    } catch (err) {
      console.error(err);
      setError('Unable to create company.');
    }
  }

  return (
    <form className="company-create-form" onSubmit={handleSubmit}>
      <div className="company-form-fields">
        <div className="field">
          <label>
            Company Name
            <input
              placeholder="company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="field">
          <label>
            Admin Email
            <input
              placeholder="admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="field">
          <label>
            Admin Full Name
            <input
              placeholder="admin full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="field">
          <label>
            Admin Password
            <input
              placeholder="admin password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      <div className="company-form-connectors">
        <h3 className="connector-manager-title">Connectors</h3>
        <p className="admin-subtext">
          Move connectors between Marketplace and Prebuilt before creating the company.
        </p>
        <div className="connector-toolbar">
          <label>
            Search
            <input
              type="search"
              placeholder="Search by connector name, type, or id"
              value={connectorSearch}
              onChange={(e) => setConnectorSearch(e.target.value)}
            />
          </label>
          <label>
            Type
            <select value={connectorTypeFilter} onChange={(e) => setConnectorTypeFilter(e.target.value)}>
              {connectorTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={connectorSort} onChange={(e) => setConnectorSort(e.target.value)}>
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </label>
        </div>

        <div className="connector-grid-layout">
          <div className="connector-card-panel">
            <div className="connector-panel-head">
              <h3>Prebuilt ({filteredPrebuiltCatalog.length})</h3>
              <div className="connector-panel-actions">
                <button type="button" onClick={selectAllFilteredPrebuilt}>
                  Select Filtered
                </button>
                <button type="button" onClick={clearPrebuiltSelection}>
                  Clear
                </button>
              </div>
            </div>

            <div className="connector-card-grid">
              {filteredPrebuiltCatalog.length === 0 ? (
                <div className="connector-empty">No prebuilt connectors selected.</div>
              ) : (
                filteredPrebuiltCatalog.map((connector) => (
                  <label
                    key={connector.id}
                    className={`connector-grid-card ${
                      selectedPrebuiltConns.has(connector.id) ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrebuiltConns.has(connector.id)}
                      onChange={() => togglePrebuiltSelection(connector.id)}
                    />
                    <div className="connector-grid-name">{connector.name}</div>
                    <div className="connector-grid-type">{connector.type}</div>
                    <div className="connector-grid-id">{connector.id}</div>
                  </label>
                ))
              )}
            </div>
            <button
              type="button"
              className="connector-action"
              onClick={moveSelectedToMarketplace}
              disabled={selectedPrebuiltConns.size === 0}
            >
              Move Selected to Marketplace ({selectedPrebuiltConns.size})
            </button>
          </div>

          <div className="connector-card-panel">
            <div className="connector-panel-head">
              <h3>Marketplace ({filteredMarketplaceCatalog.length})</h3>
              <div className="connector-panel-actions">
                <button type="button" onClick={selectAllFilteredMarketplace}>
                  Select Filtered
                </button>
                <button type="button" onClick={clearMarketplaceSelection}>
                  Clear
                </button>
              </div>
            </div>
            <div className="connector-card-grid">
              {filteredMarketplaceCatalog.length === 0 ? (
                <div className="connector-empty">No marketplace connectors for this filter.</div>
              ) : (
                filteredMarketplaceCatalog.map((connector) => (
                  <label
                    key={connector.id}
                    className={`connector-grid-card ${
                      selectedMarketConns.has(connector.id) ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarketConns.has(connector.id)}
                      onChange={() => toggleMarketSelection(connector.id)}
                    />
                    <div className="connector-grid-name">{connector.name}</div>
                    <div className="connector-grid-type">{connector.type}</div>
                    <div className="connector-grid-id">{connector.id}</div>
                  </label>
                ))
              )}
            </div>
            <button
              type="button"
              className="connector-action"
              onClick={purchaseSelected}
              disabled={selectedMarketConns.size === 0}
            >
              Add Selected to Prebuilt ({selectedMarketConns.size})
            </button>
          </div>
        </div>
      </div>

      <div className="company-form-actions">
        <button type="submit" className="primary-btn">
          Create Company
        </button>
      </div>
    </form>
  );
}
