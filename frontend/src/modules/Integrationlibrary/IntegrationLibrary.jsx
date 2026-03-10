import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ArrowDownUp, Plus } from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { connectorsApi } from './services/connectors.api';
import './IntegrationLibrary.css';

const PAGE_SIZE = 24;

const isGuideJsonUrl = (v) => {
  const s = String(v || '').trim();
  return s.startsWith('/') || s.startsWith('http://') || s.startsWith('https://');
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const GuideJsonTags = ({ connectorId, guideUrl, jsonUrl, setError }) => {
  const [downloading, setDownloading] = useState(null);
  const canDownload = connectorId && (isGuideJsonUrl(guideUrl) || isGuideJsonUrl(jsonUrl));

  const handleDownloadGuide = async () => {
    if (!connectorId) return;
    setDownloading('guide');
    setError?.('');
    try {
      const content = await connectorsApi.getConnectorGuide(connectorId);
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([text], { type: 'text/markdown' });
      downloadBlob(blob, `${connectorId}_guide.md`);
    } catch (e) {
      setError?.(e.message || 'Failed to download guide');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadJson = async () => {
    if (!connectorId) return;
    setDownloading('json');
    setError?.('');
    try {
      const content = await connectorsApi.getConnectorJson(connectorId);
      const text = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      const blob = new Blob([text], { type: 'application/json' });
      downloadBlob(blob, `${connectorId}_config.json`);
    } catch (e) {
      setError?.(e.message || 'Failed to download JSON');
    } finally {
      setDownloading(null);
    }
  };

  if (!canDownload) {
    return (
      <div className="ib-mini-tags">
        <span className="ib-tag-guide">{guideUrl || 'Guide'}</span>
        <span className="ib-tag-json">{jsonUrl || 'JSON'}</span>
      </div>
    );
  }

  return (
    <div className="ib-mini-tags">
      <button
        type="button"
        className="ib-tag-guide"
        onClick={handleDownloadGuide}
        disabled={!!downloading}
      >
        {downloading === 'guide' ? '…' : 'Guide'}
      </button>
      <button
        type="button"
        className="ib-tag-json"
        onClick={handleDownloadJson}
        disabled={!!downloading}
      >
        {downloading === 'json' ? '…' : 'JSON'}
      </button>
    </div>
  );
};
const normalizeConnectorKey = (value) => String(value || '').trim().toLowerCase();
const normalizeCategoryKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const normalizeRequestStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  const normalized = raw.includes('.') ? raw.split('.').pop() : raw;
  if (normalized === 'APPROVED') return 'GRANTED';
  if (normalized === 'REJECTED' || normalized === 'DENIED') return 'DECLINED';
  return normalized;
};

const decodeToken = (token) => {
  try {
    const payloadPart = token?.split('.')?.[1];
    if (!payloadPart) return {};
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
};

const IntegrationLibrary = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken') || '';
  const decoded = decodeToken(token);
  const tenantId =
    localStorage.getItem('connectx_tenant_id') ||
    decoded.tenant_id ||
    decoded.tid ||
    import.meta.env.VITE_TENANT_ID ||
    '';

  const [purchased, setPurchased] = useState([]);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total_purchased: 0,
    deployed: 0,
    in_progress: 0,
    marketplace_total: 0,
  });
  const [connectorTypes, setConnectorTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [showAnotherRequestModal, setShowAnotherRequestModal] = useState(false);
  const [anotherProductName, setAnotherProductName] = useState('');
  const [anotherDescription, setAnotherDescription] = useState('');
  const [busyConnector, setBusyConnector] = useState('');
  const [expandedUseCases, setExpandedUseCases] = useState({});
  const [useCaseByConnector, setUseCaseByConnector] = useState({});

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const loadMarketplace = useCallback(async () => {
    if (!tenantId) return;
    const data = await connectorsApi.getMarketplaceConnectors(tenantId, {
      search,
      category,
      page,
      per_page: PAGE_SIZE,
    });
    setMarketplaceItems(data.items || []);
    setPages(data.pages || 1);
  }, [tenantId, search, category, page]);

  const loadData = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant context not found. Please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [purchasedRows, statsRows, requestRows] = await Promise.all([
        connectorsApi.getPurchasedConnectors(tenantId),
        connectorsApi.getConnectorStats(tenantId),
        connectorsApi.getTenantRequests(tenantId),
      ]);
      setPurchased(purchasedRows || []);
      setStats(statsRows || {});
      setRequests(requestRows || []);
      try {
        const categoriesRows = await connectorsApi.getConnectorCategories();
        const deduped = new Map();
        (categoriesRows || []).forEach((row) => {
          const displayName = (row.name || 'Unknown').trim();
          const key = normalizeCategoryKey(displayName);
          if (!deduped.has(key)) {
            deduped.set(key, {
              type: displayName,
              count: Number(row.count || 0),
            });
          }
        });
        const typeRows = Array.from(deduped.values()).sort((a, b) => a.type.localeCompare(b.type));
        setConnectorTypes(typeRows);
      } catch {
        setConnectorTypes([]);
      }
    } catch (e) {
      setError(e.message || 'Failed to load integration data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!tenantId) return;
    loadMarketplace().catch(() => {});
  }, [loadMarketplace, tenantId]);

  const requestedConnectorIds = useMemo(
    () =>
      new Set(
        (requests || [])
          .filter((request) => normalizeRequestStatus(request.status) !== 'DECLINED')
          .map((request) => normalizeConnectorKey(request.connector_id || request.connector_name)),
      ),
    [requests],
  );

  const latestRequestByConnector = useMemo(() => {
    const sorted = [...(requests || [])].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
    const map = new Map();
    sorted.forEach((request) => {
      const key = normalizeConnectorKey(request.connector_id || request.connector_name);
      if (!map.has(key)) map.set(key, request);
    });
    return map;
  }, [requests]);

  const readyForDeployment = useMemo(
    () => purchased.filter((connector) => normalizeRequestStatus(connector.status) === 'DEPLOYED'),
    [purchased],
  );
  const buildingConnectors = useMemo(
    () => purchased.filter((connector) => normalizeRequestStatus(connector.status) === 'IN_PROGRESS'),
    [purchased],
  );
  const pendingRequests = useMemo(
    () =>
      requests
        .filter((request) => normalizeRequestStatus(request.status) === 'PENDING')
        .slice(0, 8),
    [requests],
  );

  const categoryChips = useMemo(() => {
    const base = connectorTypes || [];
    const total = Number(stats.marketplace_total || 0);
    return [{ type: 'ALL', count: total }, ...base];
  }, [connectorTypes, stats.marketplace_total]);

  /* Filter out requested connectors from marketplace grid */
  const displayedMarketplaceItems = useMemo(
    () =>
      (marketplaceItems || []).filter(
        (connector) =>
          !requestedConnectorIds.has(normalizeConnectorKey(connector.connector_id || connector.name)),
      ),
    [marketplaceItems, requestedConnectorIds],
  );

  const requestConnector = async (connector) => {
    setBusyConnector(connector.connector_id);
    try {
      await connectorsApi.requestConnector(tenantId, {
        connector_id: connector.connector_id,
        selected_ingestion: [],
        selected_action: [],
        custom_ingestion_text: null,
        custom_action_text: null,
        needs_guidance: false,
      });
      notify(`${connector.name} requested.`);
      await loadData();
    } catch (e) {
      setError(e.message || 'Failed to submit request');
    } finally {
      setBusyConnector('');
    }
  };

  const toggleUseCases = async (connector) => {
    const id = connector.connector_id;
    setExpandedUseCases((prev) => ({ ...prev, [id]: !prev[id] }));
    if (useCaseByConnector[id]) return;
    try {
      const data = await connectorsApi.getConnectorUsecases(id);
      setUseCaseByConnector((prev) => ({ ...prev, [id]: data }));
    } catch (e) {
      setError(e.message || 'Failed to load use cases');
    }
  };

  const openAnotherRequestModal = () => {
    setAnotherProductName('');
    setAnotherDescription('');
    setShowAnotherRequestModal(true);
  };

  const submitAnotherRequest = async () => {
    if (!anotherProductName.trim()) {
      setError('System name is required.');
      return;
    }
    try {
      await connectorsApi.submitDummyRequest(tenantId, {
        product_name: anotherProductName.trim(),
        description: anotherDescription.trim(),
      });
      setShowAnotherRequestModal(false);
      notify('Request submitted.');
    } catch (e) {
      setError(e.message || 'Failed to submit request');
    }
  };

  const pageItems = useMemo(() => {
    if (pages <= 1) return [1];
    const items = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(pages - 1, page + 1);
    if (start > 2) items.push('left-ellipsis');
    for (let p = start; p <= end; p += 1) items.push(p);
    if (end < pages - 1) items.push('right-ellipsis');
    if (pages > 1) items.push(pages);
    return items;
  }, [page, pages]);

  if (loading) {
    return <div className="integration-page">Loading Integration Library...</div>;
  }

  return (
    <div className="integration-page">
      <div className="ib-header">
        <div>
          <h1>Pre-Built Connectors</h1>
          <p>{stats.marketplace_total || 0}+ connectors across {(connectorTypes || []).length} categories.</p>
        </div>
        <button className="ib-request-top-btn" onClick={openAnotherRequestModal}>+ Request Connector</button>
      </div>

      {error ? <div className="integration-error">{error}</div> : null}

      <section className="ib-section ib-my-connectors">
        <div className="ib-section-head ib-my-connectors-head">
          <span className="ib-icon-rocket" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
          </span>
          <h2>My Connectors ({readyForDeployment.length + buildingConnectors.length + pendingRequests.length})</h2>
        </div>
        <div className="ib-status-block ib-ready-block">
          <h3 className="ib-ready-label">
            <span className="ib-icon-arrow" aria-hidden>→</span>
            READY FOR DEPLOYMENT ({readyForDeployment.length})
          </h3>
          <div className="ib-mini-grid ib-connector-cards-grid">
            {readyForDeployment.map((connector) => (
              <div key={`ready-${connector.connector_id}`} className="ib-unified-card ib-connector-card-ready">
                <div className="ib-card-header">
                  <div className="ib-card-header-left">
                    <div className="ib-card-logo">
                      <img src={connector.logo_url || 'https://via.placeholder.com/40'} alt={connector.name} />
                    </div>
                    <div>
                      <h3 className="ib-card-title">{connector.name}</h3>
                      <p className="ib-card-subtitle">{connector.type || 'Unknown'} · {connector.version_name || 'v1.0.0'}</p>
                    </div>
                  </div>
                </div>
                <button
                  className="ib-usecase-btn"
                  onClick={() => toggleUseCases(connector)}
                  disabled={busyConnector === connector.connector_id}
                >
                  <ArrowDownUp className="ib-icon-sm" />
                  Use Cases
                  <ChevronDown className={`ib-icon-sm ib-chevron ${expandedUseCases[connector.connector_id] ? 'expanded' : ''}`} />
                </button>
                {expandedUseCases[connector.connector_id] ? (
                  <div className="ib-usecase-box">
                    {!useCaseByConnector[connector.connector_id] ? (
                      <div>Loading use cases...</div>
                    ) : (() => {
                      const uc = useCaseByConnector[connector.connector_id];
                      const ing = uc?.ingestion || [];
                      const act = uc?.action || [];
                      return (ing.length || act.length) ? (
                        <>
                          {ing.length ? (
                            <>
                              <div className="ib-usecase-section-title">INGESTION</div>
                              {ing.slice(0, 3).map((item) => (
                                <div key={`ing-ready-${connector.connector_id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                          {act.length ? (
                            <>
                              <div className="ib-usecase-section-title">ACTIONS</div>
                              {act.slice(0, 3).map((item) => (
                                <div key={`act-ready-${connector.connector_id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                        </>
                      ) : (
                        <div className="empty-state">No use cases available</div>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="ib-card-tags">
                  <span className="ib-tag-pill">{connector.type || 'Unknown'}</span>
                  <span className="ib-tag-pill">Enterprise</span>
                </div>
                <div className="ib-card-footer">
                  <GuideJsonTags connectorId={connector.connector_id} guideUrl={connector.guide_url} jsonUrl={connector.json_url} setError={setError} />
                </div>
              </div>
            ))}
            {!readyForDeployment.length ? <div className="empty-state">No ready connectors.</div> : null}
          </div>
        </div>
        <div className="ib-status-block ib-building-block">
          <h3 className="ib-building-label">
            <span className="ib-icon-arrow" aria-hidden>→</span>
            BUILDING ({buildingConnectors.length})
          </h3>
          <div className="ib-mini-grid ib-connector-cards-grid">
            {buildingConnectors.map((connector) => (
              <div key={`building-${connector.connector_id}`} className="ib-unified-card ib-connector-card-building">
                <div className="ib-card-header">
                  <div className="ib-card-header-left">
                    <div className="ib-card-logo">
                      <img src={connector.logo_url || 'https://via.placeholder.com/40'} alt={connector.name} />
                    </div>
                    <div>
                      <h3 className="ib-card-title">{connector.name}</h3>
                      <p className="ib-card-subtitle">{connector.type || 'Unknown'} · {connector.version_name || 'v1.0.0'}</p>
                    </div>
                  </div>
                </div>
                <button
                  className="ib-usecase-btn"
                  onClick={() => toggleUseCases(connector)}
                  disabled={busyConnector === connector.connector_id}
                >
                  <ArrowDownUp className="ib-icon-sm" />
                  Use Cases
                  <ChevronDown className={`ib-icon-sm ib-chevron ${expandedUseCases[connector.connector_id] ? 'expanded' : ''}`} />
                </button>
                {expandedUseCases[connector.connector_id] ? (
                  <div className="ib-usecase-box">
                    {!useCaseByConnector[connector.connector_id] ? (
                      <div>Loading use cases...</div>
                    ) : (() => {
                      const uc = useCaseByConnector[connector.connector_id];
                      const ing = uc?.ingestion || [];
                      const act = uc?.action || [];
                      return (ing.length || act.length) ? (
                        <>
                          {ing.length ? (
                            <>
                              <div className="ib-usecase-section-title">INGESTION</div>
                              {ing.slice(0, 3).map((item) => (
                                <div key={`ing-building-${connector.connector_id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                          {act.length ? (
                            <>
                              <div className="ib-usecase-section-title">ACTIONS</div>
                              {act.slice(0, 3).map((item) => (
                                <div key={`act-building-${connector.connector_id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                        </>
                      ) : (
                        <div className="empty-state">No use cases available</div>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="ib-card-tags">
                  <span className="ib-tag-pill">{connector.type || 'Unknown'}</span>
                  <span className="ib-tag-pill">Enterprise</span>
                </div>
                <div className="ib-card-footer" />
              </div>
            ))}
            {!buildingConnectors.length ? <div className="empty-state">No connectors in build.</div> : null}
          </div>
        </div>
        <div className="ib-status-block ib-pending-block">
          <h3 className="ib-pending-label">
            <span aria-hidden>⏳</span>
            PENDING ({pendingRequests.length})
          </h3>
          <div className="ib-mini-grid ib-connector-cards-grid">
            {pendingRequests.map((request) => (
              <div key={`pending-${request.id}`} className="ib-unified-card ib-connector-card-pending">
                <div className="ib-card-header">
                  <div className="ib-card-header-left">
                    <div className="ib-card-logo">
                      <img src={request.logo_url || 'https://via.placeholder.com/40'} alt={request.connector_name || request.connector_id} />
                    </div>
                    <div>
                      <h3 className="ib-card-title">{request.connector_name || request.connector_id}</h3>
                      <p className="ib-card-subtitle">{request.connector_type || 'Unknown'} · {request.version_name || 'v1.0.0'}</p>
                    </div>
                  </div>
                </div>
                <button
                  className="ib-usecase-btn"
                  onClick={() => toggleUseCases({ connector_id: request.connector_id || request.connector_name })}
                  disabled={busyConnector === (request.connector_id || request.connector_name)}
                >
                  <ArrowDownUp className="ib-icon-sm" />
                  Use Cases
                  <ChevronDown className={`ib-icon-sm ib-chevron ${expandedUseCases[request.connector_id || request.connector_name] ? 'expanded' : ''}`} />
                </button>
                {expandedUseCases[request.connector_id || request.connector_name] ? (
                  <div className="ib-usecase-box">
                    {!useCaseByConnector[request.connector_id || request.connector_name] ? (
                      <div>Loading use cases...</div>
                    ) : (() => {
                      const uc = useCaseByConnector[request.connector_id || request.connector_name];
                      const ing = uc?.ingestion || [];
                      const act = uc?.action || [];
                      return (ing.length || act.length) ? (
                        <>
                          {ing.length ? (
                            <>
                              <div className="ib-usecase-section-title">INGESTION</div>
                              {ing.slice(0, 3).map((item) => (
                                <div key={`ing-pending-${request.id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                          {act.length ? (
                            <>
                              <div className="ib-usecase-section-title">ACTIONS</div>
                              {act.slice(0, 3).map((item) => (
                                <div key={`act-pending-${request.id}-${item}`} className="ib-usecase-line">- {item}</div>
                              ))}
                            </>
                          ) : null}
                        </>
                      ) : (
                        <div className="empty-state">No use cases available</div>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="ib-card-tags">
                  <span className="ib-tag-pill">{request.connector_type || 'Unknown'}</span>
                  <span className="ib-tag-pill">Enterprise</span>
                </div>
                <div className="ib-card-footer" />
              </div>
            ))}
            {!pendingRequests.length ? <div className="empty-state">No pending requests.</div> : null}
          </div>
        </div>
      </section>

      <section className="ib-section">
        <div className="ib-toolbar">
          <input
            type="text"
            placeholder={`Search ${stats.marketplace_total || 0}+ connectors...`}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="ib-category-wrap">
          {categoryChips.map((chip) => (
            <button
              type="button"
              key={chip.type}
              className={`ib-category-chip ${category === chip.type ? 'active' : ''}`}
              onClick={() => {
                setPage(1);
                setCategory(chip.type);
              }}
            >
              {chip.type} ({chip.count || 0})
            </button>
          ))}
        </div>
      </section>

      <section className="ib-connector-grid">
        {displayedMarketplaceItems.map((connector) => {
          const normalizedKey = normalizeConnectorKey(connector.connector_id || connector.name);
          const latest = latestRequestByConnector.get(normalizedKey);
          const isDeclined = normalizeRequestStatus(latest?.status) === 'DECLINED';
          const isRequested = requestedConnectorIds.has(normalizedKey);
          const useCases = useCaseByConnector[connector.connector_id];
          const expanded = !!expandedUseCases[connector.connector_id];

          return (
            <article key={connector.connector_id} className="ib-connector-card ib-glass-card">
              <div className="ib-card-header">
                <div className="ib-card-header-left">
                  <div className="ib-card-logo">
                    <img
                      src={connector.logo_url || 'https://via.placeholder.com/40'}
                      alt={connector.name}
                    />
                  </div>
                  <div>
                    <h3 className="ib-card-title">{connector.name}</h3>
                    <p className="ib-card-subtitle">
                      {connector.type || 'Unknown'} · {connector.version_name || 'v1.0.0'}
                    </p>
                  </div>
                </div>
              </div>
              {isDeclined ? (
                <p className="ib-reject-reason">Rejected: {latest?.decision_note || 'No reason provided'}</p>
              ) : null}
              <button
                className="ib-usecase-btn"
                onClick={() => toggleUseCases(connector)}
                disabled={busyConnector === connector.connector_id}
              >
                <ArrowDownUp className="ib-icon-sm" />
                Use Cases
                <ChevronDown className={`ib-icon-sm ib-chevron ${expanded ? 'expanded' : ''}`} />
              </button>
              {expanded ? (
                <div className="ib-usecase-box">
                  {!useCases ? (
                    <div>Loading use cases...</div>
                  ) : (useCases?.ingestion || []).length || (useCases?.action || []).length ? (
                    <>
                      {(useCases?.ingestion || []).length ? (
                        <>
                          <div className="ib-usecase-section-title">INGESTION</div>
                          {(useCases?.ingestion || []).slice(0, 3).map((item) => (
                            <div key={`ing-${connector.connector_id}-${item}`} className="ib-usecase-line">
                              - {item}
                            </div>
                          ))}
                        </>
                      ) : null}
                      {(useCases?.action || []).length ? (
                        <>
                          <div className="ib-usecase-section-title">ACTIONS</div>
                          {(useCases?.action || []).slice(0, 3).map((item) => (
                            <div key={`act-${connector.connector_id}-${item}`} className="ib-usecase-line">
                              - {item}
                            </div>
                          ))}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <div className="empty-state">No use cases available</div>
                  )}
                </div>
              ) : null}
              <div className="ib-card-tags">
                <span className="ib-tag-pill">{connector.type || 'Unknown'}</span>
                <span className="ib-tag-pill">Enterprise</span>
              </div>
              <div className="ib-card-footer">
                <button
                  className="ib-request-card-btn"
                  disabled={busyConnector === connector.connector_id || isRequested}
                  onClick={() => requestConnector(connector)}
                >
                  <Plus className="ib-icon-btn" />
                  Request Connector
                </button>
              </div>
            </article>
          );
        })}
        {!displayedMarketplaceItems.length ? <div className="empty-state">No marketplace connectors found.</div> : null}
      </section>

      <div className="pagination">
        {pageItems.map((item) =>
          typeof item === 'number' ? (
            <button
              key={`page-${item}`}
              className={item === page ? 'page-btn active' : 'page-btn'}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="ellipsis">...</span>
          ),
        )}
      </div>

      {showAnotherRequestModal ? (
        <div className="request-modal-backdrop">
          <div className="request-modal">
            <h3 className="request-modal-title">Request Another Connector</h3>
            <p className="request-modal-desc">Provide product details for your connector request.</p>
            <div className="modal-section">
              <label className="modal-label">System Name</label>
              <input
                className="modal-input"
                type="text"
                value={anotherProductName}
                onChange={(e) => setAnotherProductName(e.target.value)}
                placeholder="Enter system name"
              />
            </div>
            <div className="modal-section">
              <label className="modal-label">Description</label>
              <textarea
                className="modal-input modal-textarea"
                value={anotherDescription}
                onChange={(e) => setAnotherDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setShowAnotherRequestModal(false)}>Cancel</button>
              <button className="modal-btn-submit" onClick={submitAnotherRequest}>Submit</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="integration-toast">{toast}</div> : null}
    </div>
  );
};

export default IntegrationLibrary;