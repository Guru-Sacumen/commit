import React, { useState, useMemo } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography
} from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import {
  extractErrorMessage,
  connectorMatchesFilters,
  sortConnectorsByName,
} from "../utils/adminUtils";
import ModernAlert from '../../../common/components/ModernAlert';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function CompanyForm({
  setCompanies,
  token,
  connectorCatalog = [],
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [prebuiltConnectorIds, setPrebuiltConnectorIds] = useState(new Set());
  const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
  const [selectedPrebuiltConns, setSelectedPrebuiltConns] = useState(new Set());
  const [connectorSearch, setConnectorSearch] = useState("");
  const [connectorTypeFilter, setConnectorTypeFilter] = useState("ALL");
  const [connectorSort, setConnectorSort] = useState("asc");

  const prebuiltCatalog = useMemo(
    () =>
      connectorCatalog.filter((connector) =>
        prebuiltConnectorIds.has(connector.id),
      ),
    [connectorCatalog, prebuiltConnectorIds],
  );
  const marketplaceCatalog = useMemo(
    () =>
      connectorCatalog.filter(
        (connector) => !prebuiltConnectorIds.has(connector.id),
      ),
    [connectorCatalog, prebuiltConnectorIds],
  );
  const connectorTypeOptions = useMemo(() => {
    const options = new Set(
      connectorCatalog.map((connector) => connector.type || "Unknown"),
    );
    return ["ALL", ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  }, [connectorCatalog]);
  const filteredPrebuiltCatalog = useMemo(
    () =>
      sortConnectorsByName(
        prebuiltCatalog.filter((connector) =>
          connectorMatchesFilters(
            connector,
            connectorSearch,
            connectorTypeFilter,
          ),
        ),
        connectorSort,
      ),
    [prebuiltCatalog, connectorSearch, connectorTypeFilter, connectorSort],
  );
  const filteredMarketplaceCatalog = useMemo(
    () =>
      sortConnectorsByName(
        marketplaceCatalog.filter((connector) =>
          connectorMatchesFilters(
            connector,
            connectorSearch,
            connectorTypeFilter,
          ),
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
    setError("");

    try {
      const body = {
        name,
        admin_email: email,
        admin_full_name: fullName,
        admin_password: password,
        connectors: Array.from(prebuiltConnectorIds),
      };

      const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(
          extractErrorMessage(await res.text(), "Failed to create company"),
        );
      }

      const data = await res.json();
      const listRes = await fetch(`${API_BASE_URL}/superadmin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        throw new Error(
          extractErrorMessage(
            await listRes.text(),
            "Failed to refresh company list",
          ),
        );
      }
      const comps = await listRes.json();

      setCompanies(comps);
      setName("");
      setEmail("");
      setFullName("");
      setPassword("");
      setPrebuiltConnectorIds(new Set());
      setSelectedMarketConns(new Set());
      setSelectedPrebuiltConns(new Set());
      setConnectorSearch("");
      setConnectorTypeFilter("ALL");
      setConnectorSort("asc");
      if (onSuccess) onSuccess(data.tenant_id);
    } catch (err) {
      console.error(err);
      setError("Unable to create company.");
    }
  }

  return (
    <div>
      <ModernAlert 
        open={!!error} 
        message={error} 
        severity="error"
        onClose={() => setError('')}
      />

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
          <div className="field max-[300px]:">
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
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>
        </div>
        <hr></hr>
        <div className="connector-selection-section">
          <h4 className="text-blue-600 font-bold">Select Prebuilt Connectors</h4>
          <div className="connector-toolbar pl-2">
            <label>
              Search Connectors
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
                    {type === "ALL" ? "All Types" : type}
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
          </div>

          <div className="connector-grid-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                  <div className="connector-empty">
                    No connectors available.
                  </div>
                ) : (
                  filteredMarketplaceCatalog.map((connector) => (
                    <label
                      key={connector.id}
                      className={`connector-grid-card ${
                        selectedMarketConns.has(connector.id) ? "selected" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarketConns.has(connector.id)}
                        onChange={() => toggleMarketSelection(connector.id)}
                      />
                      <div className="connector-grid-name">
                        {connector.name}
                      </div>
                      <div className="connector-grid-type">
                        {connector.type}
                      </div>
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
                Add Selected ({selectedMarketConns.size})
              </button>
            </section>

            <section className="connector-card-panel">
              <div className="connector-panel-head">
                <h3>Selected ({filteredPrebuiltCatalog.length})</h3>
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
                  <div className="connector-empty">No connectors selected.</div>
                ) : (
                  filteredPrebuiltCatalog.map((connector) => (
                    <label
                      key={connector.id}
                      className={`connector-grid-card ${
                        selectedPrebuiltConns.has(connector.id)
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrebuiltConns.has(connector.id)}
                        onChange={() => togglePrebuiltSelection(connector.id)}
                      />
                      <div className="connector-grid-name">
                        {connector.name}
                      </div>
                      <div className="connector-grid-type">
                        {connector.type}
                      </div>
                      <div className="connector-grid-id">{connector.id}</div>
                    </label>
                  ))
                )}
              </div>
              <button
                type="button"
                className="connector-action danger"
                onClick={moveSelectedToMarketplace}
                disabled={selectedPrebuiltConns.size === 0}
              >
                Remove Selected ({selectedPrebuiltConns.size})
              </button>
            </section>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-btn">
            Create Company
          </button>
        </div>
      </form>
    </div>
  );
}

export default CompanyForm;
