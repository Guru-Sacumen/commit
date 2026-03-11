import React, { useState, useMemo, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Chip,
  Alert
} from '@mui/material';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState("");
  const [prebuiltConnectorIds, setPrebuiltConnectorIds] = useState(new Set());
  const [selectedMarketConns, setSelectedMarketConns] = useState(new Set());
  const [selectedPrebuiltConns, setSelectedPrebuiltConns] = useState(new Set());
  const [connectorSearch, setConnectorSearch] = useState("");
  const [connectorTypeFilter, setConnectorTypeFilter] = useState("ALL");
  const [connectorSort, setConnectorSort] = useState("asc");

  // Auto-generate password on component mount
  useEffect(() => {
    generatePassword();
  }, []);

  // Function to generate a secure password
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    // Ensure at least one of each required character type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    
    // Fill the rest
    for (let i = 4; i < 10; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(password);
  };

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
    setSuccessMessage("");

    try {
      const body = {
        name,
        admin_email: email,
        admin_full_name: fullName,
        admin_password: password, // Send auto-generated password
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
      
      // Show success message with generated password
      const displayPassword = data.generated_password || password;
      setSuccessMessage(
        `Company created successfully! Admin password: ${displayPassword}`
      );
      
      // Reset form
      setName("");
      setEmail("");
      setFullName("");
      generatePassword(); // Generate new password for next use
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
    <div className="mt-2">
      <ModernAlert 
        open={!!error} 
        message={error} 
        severity="error"
        onClose={() => setError('')}
      />

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Company Name"
            placeholder="company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            variant="outlined"
            size="small"
          />

          <TextField
            label="Admin Email"
            placeholder="admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            variant="outlined"
            type="email"
            size="small"
          />

          <TextField
            label="Admin Full Name"
            placeholder="admin full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            fullWidth
            variant="outlined"
            size="small"
          />

          <Box>
            <TextField
              label="Admin Password"
              placeholder="admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              variant="outlined"
              type={showPassword ? 'text' : 'password'}
              size="small"
              helperText="Password is automatically generated and will be sent via email"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={generatePassword}
                      edge="end"
                      size="small"
                      title="Regenerate password"
                    >
                      <RefreshCw size={16} />
                    </IconButton>
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Chip 
              label="Auto-generated secure password" 
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ mt: 1, fontSize: '0.75rem' }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="primary-btn">
            Create Company
          </button>
        </Box>
      </form>
    </div>
  );
}

export default CompanyForm;
