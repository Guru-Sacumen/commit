import React, { useState } from 'react';
import { formatDateTime, csvEscape, downloadCsv } from '../utils/adminUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function ConnectorManagement({
  users,
  purchasedCatalog,
  marketplaceCatalog,
  filteredPurchasedCatalog,
  filteredMarketplaceCatalog,
  selectedMarketConns,
  selectedPurchasedConns,
  connectorRequests,
  filteredConnectorRequests,
  connectorLoading,
  connectorBusy,
  requestBusyId,
  connectorSubTab,
  connectorSearch,
  connectorTypeFilter,
  connectorSort,
  connectorDensity,
  notificationSearch,
  notificationStatusFilter,
  notificationSort,
  connectorTypeOptions,
  canManageConnectors,
  currentTenant,
  token,
  onConnectorSubTabChange,
  onConnectorSearchChange,
  onConnectorTypeFilterChange,
  onConnectorSortChange,
  onConnectorDensityChange,
  onNotificationSearchChange,
  onNotificationStatusFilterChange,
  onNotificationSortChange,
  onToggleMarketplaceSelection,
  onTogglePurchasedSelection,
  onSelectAllFilteredMarketplace,
  onSelectAllFilteredPrebuilt,
  onClearMarketplaceSelection,
  onClearPrebuiltSelection,
  onPurchaseSelectedConnectors,
  onMoveSelectedToMarketplace,
  onConnectorRequestDecision,
  onToggleRequestSelection,
  onSelectAllPendingRequests,
  onClearSelectedRequests,
  onBulkConnectorRequestDecision,
  selectedRequestIds,
}) {
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
  }

  if (connectorSubTab === 'connectors') {
    return (
      <div className="connector-manager">
        <div className="connector-manager-header">
          <h2>Connector Management</h2>
          <div className="connector-manager-actions">
            <button type="button" className="secondary-btn" onClick={exportConnectorSnapshot}>
              Export Connectors CSV
            </button>
          </div>
        </div>

        <div className="connector-toolbar">
          <label>
            Search Connectors
            <input
              type="search"
              placeholder="Search by connector name, type, or id"
              value={connectorSearch}
              onChange={(e) => onConnectorSearchChange(e.target.value)}
            />
          </label>
          <label>
            Type
            <select
              value={connectorTypeFilter}
              onChange={(e) => onConnectorTypeFilterChange(e.target.value)}
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
              onChange={(e) => onConnectorSortChange(e.target.value)}
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </label>
          <label>
            Density
            <select
              value={connectorDensity}
              onChange={(e) => onConnectorDensityChange(e.target.value)}
            >
              <option value="cozy">Cozy</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>

        <div className={`connector-grid-layout ${connectorDensity === 'compact' ? 'compact' : 'cozy'}`}>
          <section className="connector-card-panel">
            <div className="connector-panel-head">
              <h3>Prebuilt ({filteredPurchasedCatalog.length})</h3>
              <div className="connector-panel-actions">
                <button type="button" onClick={onSelectAllFilteredPrebuilt}>
                  Select Filtered
                </button>
                <button type="button" onClick={onClearPrebuiltSelection}>
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
                      onChange={() => onTogglePurchasedSelection(connector.id)}
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
              onClick={onMoveSelectedToMarketplace}
              disabled={connectorBusy || selectedPurchasedConns.size === 0}
            >
              Move Selected to Marketplace ({selectedPurchasedConns.size})
            </button>
          </section>

          <section className="connector-card-panel">
            <div className="connector-panel-head">
              <h3>Marketplace ({filteredMarketplaceCatalog.length})</h3>
              <div className="connector-panel-actions">
                <button type="button" onClick={onSelectAllFilteredMarketplace}>
                  Select Filtered
                </button>
                <button type="button" onClick={onClearMarketplaceSelection}>
                  Clear
                </button>
              </div>
            </div>
            <div className="connector-card-grid">
              {filteredMarketplaceCatalog.length === 0 ? (
                <div className="connector-empty">No connectors available in marketplace.</div>
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
                      onChange={() => onToggleMarketplaceSelection(connector.id)}
                      disabled={!canManageConnectors}
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
              onClick={onPurchaseSelectedConnectors}
              disabled={!canManageConnectors || selectedMarketConns.size === 0}
            >
              Purchase Selected ({selectedMarketConns.size})
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (connectorSubTab === 'requests') {
    return (
      <div className="connector-requests">
        <div className="connector-requests-header">
          <h2>Connector Requests</h2>
          <div className="connector-requests-actions">
            <button type="button" className="secondary-btn" onClick={exportRequestsSnapshot}>
              Export Requests CSV
            </button>
          </div>
        </div>

        <div className="requests-toolbar">
          <label>
            Search Requests
            <input
              type="search"
              placeholder="Search requests..."
              value={notificationSearch}
              onChange={(e) => onNotificationSearchChange(e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={notificationStatusFilter}
              onChange={(e) => onNotificationStatusFilterChange(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="GRANTED">Granted</option>
              <option value="DECLINED">Declined</option>
            </select>
          </label>
          <label>
            Sort
            <select
              value={notificationSort}
              onChange={(e) => onNotificationSortChange(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="sla">SLA Priority</option>
            </select>
          </label>
        </div>

        {canManageConnectors && filteredConnectorRequests.some(r => r.status === 'PENDING') && (
          <div className="bulk-actions">
            <button type="button" onClick={onSelectAllPendingRequests}>
              Select All Pending
            </button>
            <button type="button" onClick={onClearSelectedRequests}>
              Clear Selection
            </button>
            <button
              type="button"
              className="success-btn"
              onClick={() => onBulkConnectorRequestDecision('grant')}
              disabled={!selectedRequestIds.size}
            >
              Grant Selected ({selectedRequestIds.size})
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={() => onBulkConnectorRequestDecision('decline')}
              disabled={!selectedRequestIds.size}
            >
              Decline Selected ({selectedRequestIds.size})
            </button>
          </div>
        )}

        <div className="requests-list">
          {filteredConnectorRequests.length === 0 ? (
            <div className="connector-empty">No connector requests found.</div>
          ) : (
            filteredConnectorRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-info">
                    <h4>{request.connector_name || request.connector_id}</h4>
                    <p>Requested by: {request.requested_by_name || request.requested_by_email}</p>
                    <p>Created: {formatDateTime(request.created_at)}</p>
                  </div>
                  <div className="request-status">
                    <span className={`status-badge ${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                    {request.sla_state && (
                      <span className={`sla-badge ${request.sla_state.toLowerCase()}`}>
                        SLA: {request.sla_state}
                      </span>
                    )}
                  </div>
                </div>
                
                {request.request_comment && (
                  <div className="request-comment">
                    <strong>Comment:</strong> {request.request_comment}
                  </div>
                )}

                <div className="request-actions">
                  {canManageConnectors && request.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        className="success-btn"
                        onClick={() => onConnectorRequestDecision(request, 'grant')}
                        disabled={requestBusyId === request.id}
                      >
                        Grant
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => onConnectorRequestDecision(request, 'decline')}
                        disabled={requestBusyId === request.id}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  <input
                    type="checkbox"
                    checked={selectedRequestIds.has(request.id)}
                    onChange={() => onToggleRequestSelection(request.id)}
                    disabled={!canManageConnectors}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default ConnectorManagement;
