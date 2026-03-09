import React, { useState, useMemo } from 'react';
import { extractErrorMessage, formatDateTime, csvEscape, downloadCsv } from '../utils/adminUtils';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Grid,
  Checkbox,
  Button,
  TextField,
  Select,
  MenuItem,
  ButtonGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  ElectricalServices as ElectricalServicesIcon,
  Store as StoreIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  Info as InfoIcon,
  Launch as LaunchIcon,
  Category as CategoryIcon,
  Link as LinkIcon,
  CalendarToday as CalendarTodayIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import CommonSnackbar from '../../../common/components/CommonSnackbar';
import './enhanced-admin.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function EnhancedConnectorManagement({
  users,
  purchasedCatalog = [],
  marketplaceCatalog = [],
  filteredPurchasedCatalog = [],
  filteredMarketplaceCatalog = [],
  selectedMarketConns = new Set(),
  selectedPurchasedConns = new Set(),
  connectorRequests = [],
  filteredConnectorRequests = [],
  connectorLoading = false,
  connectorBusy = false,
  requestBusyId = '',
  connectorSubTab = 'installed',
  connectorSearch = '',
  connectorTypeFilter = 'ALL',
  connectorSort = 'asc',
  connectorDensity = 'comfortable',
  notificationSearch = '',
  notificationStatusFilter = 'ALL',
  notificationSort = 'desc',
  connectorTypeOptions = [],
  canManageConnectors = true,
  currentTenant = '',
  token = '',
  catalogById = new Map(),
  onConnectorSubTabChange = () => {},
  onConnectorSearchChange = () => {},
  onConnectorTypeFilterChange = () => {},
  onConnectorSortChange = () => {},
  onConnectorDensityChange = () => {},
  onNotificationSearchChange = () => {},
  onNotificationStatusFilterChange = () => {},
  onNotificationSortChange = () => {},
  onToggleMarketplaceSelection = () => {},
  onTogglePurchasedSelection = () => {},
  onSelectAllFilteredMarketplace = () => {},
  onSelectAllFilteredPrebuilt = () => {},
  onClearMarketplaceSelection = () => {},
  onClearPrebuiltSelection = () => {},
  onPurchaseSelectedConnectors = () => {},
  onMoveSelectedToMarketplace = () => {},
  onConnectorRequestDecision = () => {},
  onToggleRequestSelection = () => {},
  onSelectAllPendingRequests = () => {},
  onClearSelectedRequests = () => {},
  onBulkConnectorRequestDecision = () => {},
  selectedRequestIds = new Set(),
  onConnectorsUpdate = () => {},
  onRefreshData = () => {},
  onMarketplaceUpdate = () => {},
}) {

  // Filter marketplace to exclude already installed connectors
  const effectiveMarketplaceCatalog = useMemo(() => {
    const installedConnectorIds = new Set(purchasedCatalog.map(c => c.id || c.connector_id));
    return marketplaceCatalog.filter(connector => !installedConnectorIds.has(connector.id || connector.connector_id));
  }, [marketplaceCatalog, purchasedCatalog]);
  
  const effectiveConnectorRequests = connectorRequests;
  const [showAddConnectorForm, setShowAddConnectorForm] = useState(false);
  const [selectedConnectorForView, setSelectedConnectorForView] = useState(null);
  const [connectorForm, setConnectorForm] = useState({
    name: '',
    connector_id: '',
    type: '',
    category: '',
    logo_url: '',
    external_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Helper functions for snackbar
  const showSuccess = (message) => {
    setSnackbar({
      open: true,
      message,
      severity: 'success'
    });
  };

  const showError = (message) => {
    setSnackbar({
      open: true,
      message,
      severity: 'error'
    });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const resetConnectorForm = () => {
    setConnectorForm({
      name: '',
      connector_id: '',
      type: '',
      category: '',
      logo_url: '',
      external_url: '',
    });
    setError('');
    setSuccess('');
    setShowAddConnectorForm(false);
  };

  const handleAddConnector = async (e) => {
    e.preventDefault();
    if (!connectorForm.name || !connectorForm.connector_id) {
      showError('Connector name and ID are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/connectors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(connectorForm),
      });

      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to add connector'));
      }

      const created = await res.json();
      onConnectorsUpdate(prev => [...prev, created]);
      showSuccess('Connector added successfully');
      resetConnectorForm();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Unable to add connector');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnector = async (connectorId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/${currentTenant}/connectors/${encodeURIComponent(connectorId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to remove connector'));
      }

      const updatedConnectors = purchasedCatalog.filter(c => c.connector_id !== connectorId);
      onConnectorsUpdate(updatedConnectors);
      // Soft reload: only update marketplace without full component refresh
      onMarketplaceUpdate();
      showSuccess('Connector removed successfully');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Unable to remove connector');
    }
  };

  const exportConnectorSnapshot = () => {
    const rows = [
      ...purchasedCatalog.map((connector) => [
        'Prebuilt',
        connector.connector_id || connector.id,
        connector.name,
        connector.type || connector.category,
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
    showSuccess('Connector snapshot exported successfully');
  };

  const exportRequestsSnapshot = () => {
    const rows = connectorRequests.map((request) => [
      request.id,
      request.connector_id,
      request.requested_by,
      request.status,
      formatDateTime(request.created_at),
    ]);
    downloadCsv(
      `tenant-${currentTenant || 'unknown'}-connector-requests.csv`,
      ['Request ID', 'Connector ID', 'Requested By', 'Status', 'Created At'],
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
    showSuccess('Connector requests exported successfully');
  };

  if (['installed', 'marketplace', 'requests'].includes(connectorSubTab)) {
    return (
      <>
        <div className="enhanced-connector-management">
          <div className="connector-management-header" >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                width: "100%",

              }}
              className="mt-3 shadow-sm rounded-sm border px-3 py-4"
            >
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  Connector Governance
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Manage tenant prebuilt entitlements, marketplace inventory, and approval activity.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Card variant="outlined" sx={{ px: 2, py: 1, textAlign: "center" }}>
                    <Typography variant="caption">PREBUILT</Typography>
                    <Typography variant="h6">{purchasedCatalog.length}</Typography>
                  </Card>

                  <Card variant="outlined" sx={{ px: 2, py: 1, textAlign: "center" }}>
                    <Typography variant="caption">MARKETPLACE</Typography>
                    <Typography variant="h6">{marketplaceCatalog.length}</Typography>
                  </Card>

                  <Card variant="outlined" sx={{ px: 2, py: 1, textAlign: "center" }}>
                    <Typography variant="caption">PENDING</Typography>
                    <Typography variant="h6">
                      {connectorRequests.filter(r => r.status === "PENDING").length}
                    </Typography>
                  </Card>
                </Box>
              </Box>

            </Box>

          </div>

          {/* MUI Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={connectorSubTab}
              onChange={(e, newValue) => onConnectorSubTabChange(newValue)}
              aria-label="connector tabs"
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  minHeight: 48
                }
              }}
            >
              <Tab
                value="installed"
                label={`Installed Connectors (${purchasedCatalog.length})`}
                icon={<ElectricalServicesIcon />}
                iconPosition="start"
              />
              <Tab
                value="marketplace"
                label={`Marketplace (${effectiveMarketplaceCatalog.length})`}
                icon={<StoreIcon />}
                iconPosition="start"
              />
              <Tab
                value="requests"
                label={`Requests (${effectiveConnectorRequests.filter(r => r.status === 'PENDING').length})`}
                icon={<DescriptionIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {connectorSubTab === 'installed' && (
            <Box>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  placeholder="Search installed connectors..."
                  value={connectorSearch}
                  onChange={(e) => onConnectorSearchChange(e.target.value)}
                  sx={{ minWidth: 300 }}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
                <Select
                  size="small"
                  value={connectorTypeFilter}
                  onChange={(e) => onConnectorTypeFilterChange(e.target.value)}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  {connectorTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  value={connectorSort}
                  onChange={(e) => onConnectorSortChange(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="asc">Name A-Z</MenuItem>
                  <MenuItem value="desc">Name Z-A</MenuItem>
                </Select>
              </Box>

              {/* Installed Connectors Grid */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2,
                width: '100%'
              }}>
                {purchasedCatalog.length === 0 ? (
                  <Box sx={{ 
                    width: '100%',
                    textAlign: 'center', 
                    py: 8 
                  }}>
                    <Avatar sx={{
                      bgcolor: 'grey.300',
                      width: 64,
                      height: 64,
                      margin: '0 auto 16px',
                      fontSize: '2rem'
                    }}>
                      <ElectricalServicesIcon sx={{ fontSize: '2rem' }} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      No Connectors Installed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Browse the marketplace to install connectors.
                    </Typography>
                  </Box>
                ) : (
                  purchasedCatalog.map((connector) => {
                    const connectorName = connector.name || connector.connector_name || 'Unknown Connector';
                    const connectorType = connector.type || connector.category || 'Unknown Type';
                    const connectorStatus = connector.status || 'active';
                    const connectorDescription = connector.description || 'No description available';
                    const connectorId = connector.id || connector.connector_id || 'unknown';
                    
                    return (
                    <Box sx={{ 
                      flex: '0 0 calc(20% - 16px)', // 5 cards per row, accounting for gap
                      minWidth: 200 // Minimum width for responsiveness
                    }} key={connectorId}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          minHeight: 180,
                          '&:hover': { borderColor: 'primary.light', boxShadow: 2 }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar
                              sx={{
                                bgcolor: 'primary.main',
                                width: 40,
                                height: 40,
                                fontSize: '1rem'
                              }}
                            >
                              {connectorName ? connectorName.charAt(0).toUpperCase() : '?'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.9rem'
                                }}
                              >
                                {connectorName}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {connectorType}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={connectorId}
                              size="medium"
                              variant="outlined"
                              sx={{ fontSize: '0.8rem', height: 28 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => setSelectedConnectorForView(connector)}
                                  sx={{ p: 0.5 }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove Connector">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteConnector(connectorId)}
                                  sx={{ p: 0.5 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          )}

          {connectorSubTab === 'marketplace' && (
            <Box>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search marketplace..."
                    value={connectorSearch}
                    onChange={(e) => onConnectorSearchChange(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <Select
                    size="small"
                    value={connectorTypeFilter}
                    onChange={(e) => onConnectorTypeFilterChange(e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    {(connectorTypeOptions || []).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type === 'ALL' ? 'All Types' : type}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onSelectAllFilteredMarketplace}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onClearMarketplaceSelection}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onPurchaseSelectedConnectors}
                    disabled={selectedMarketConns.size === 0}
                    startIcon={<StoreIcon />}
                  >
                    Install ({selectedMarketConns.size})
                  </Button>
                </Box>
              </Box>

              {/* Connectors Grid */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2,
                width: '100%'
              }}>
                {filteredMarketplaceCatalog.length === 0 ? (
                  <Box sx={{ 
                    width: '100%',
                    textAlign: 'center', 
                    py: 8 
                  }}>
                    <Avatar sx={{
                      bgcolor: 'grey.300',
                      width: 64,
                      height: 64,
                      margin: '0 auto 16px',
                      fontSize: '2rem'
                    }}>
                      <StoreIcon sx={{ fontSize: '2rem' }} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      No Connectors Available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Check back later for new connectors.
                    </Typography>
                  </Box>
                ) : (
                  filteredMarketplaceCatalog.map((connector) => (
                    <Box sx={{ 
                      flex: '0 0 calc(20% - 16px)', // 5 cards per row, accounting for gap
                      minWidth: 200 // Minimum width for responsiveness
                    }} key={connector.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          minHeight: 180,
                          border: selectedMarketConns.has(connector.id) ? 2 : 1,
                          borderColor: selectedMarketConns.has(connector.id) ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.light' }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar
                              size="medium"
                              sx={{
                                bgcolor: 'secondary.main',
                                width: 40,
                                height: 40,
                                fontSize: '1rem'
                              }}
                            >
                              <ElectricalServicesIcon fontSize="small" />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.9rem'
                                }}
                              >
                                {connector.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {connector.type}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={connector.id}
                              size="medium"
                              variant="outlined"
                              sx={{ fontSize: '0.8rem', height: 28 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => setSelectedConnectorForView(connector)}
                                  sx={{ p: 0.5 }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Checkbox
                                size="small"
                                checked={selectedMarketConns.has(connector.id)}
                                onChange={() => onToggleMarketplaceSelection(connector.id)}
                                sx={{ p: 0.5 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          )}

          {connectorSubTab === 'requests' && (
            <Box>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search requests..."
                    value={notificationSearch}
                    onChange={(e) => onNotificationSearchChange(e.target.value)}
                    sx={{ minWidth: 200 }}
                  />
                  <Select
                    size="small"
                    value={notificationStatusFilter}
                    onChange={(e) => onNotificationStatusFilterChange(e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="APPROVED">Approved</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </Select>
                  <Select
                    size="small"
                    value={notificationSort}
                    onChange={(e) => onNotificationSortChange(e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="desc">Newest First</MenuItem>
                    <MenuItem value="asc">Oldest First</MenuItem>
                  </Select>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onSelectAllPendingRequests}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={onClearSelectedRequests}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => onBulkConnectorRequestDecision('grant')}
                    disabled={!selectedRequestIds.size}
                  >
                    Approve Selected
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => onBulkConnectorRequestDecision('deny')}
                    disabled={!selectedRequestIds.size}
                  >
                    Reject Selected
                  </Button>
                </Box>
              </Box>

              {/* Requests Grid */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2,
                width: '100%'
              }}>
                {filteredConnectorRequests.length === 0 ? (
                  <Box sx={{ 
                    width: '100%',
                    textAlign: 'center', 
                    py: 8 
                  }}>
                    <Avatar sx={{
                      bgcolor: 'grey.300',
                      width: 64,
                      height: 64,
                      margin: '0 auto 16px',
                      fontSize: '2rem'
                    }}>
                      <DescriptionIcon sx={{ fontSize: '2rem' }} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      No Requests Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No connector requests match your current filters.
                    </Typography>
                  </Box>
                ) : (
                  filteredConnectorRequests.map((request) => (
                    <Box sx={{ 
                      flex: '0 0 calc(20% - 16px)', // 5 cards per row, accounting for gap
                      minWidth: 200 // Minimum width for responsiveness
                    }} key={request.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          minHeight: 180,
                          border: selectedRequestIds.has(request.id) ? 2 : 1,
                          borderColor: selectedRequestIds.has(request.id) ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.light' }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.9rem',
                                  mb: 0.5
                                }}
                              >
                                {request.connector_name || request.connector_id}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                  fontSize: '0.8rem',
                                  mb: 1
                                }}
                              >
                                {request.requested_by} • {formatDateTime(request.created_at)}
                              </Typography>
                              <Chip
                                label={request.status}
                                size="medium"
                                color={
                                  request.status === 'PENDING' ? 'warning' :
                                  request.status === 'APPROVED' ? 'success' :
                                  request.status === 'REJECTED' ? 'error' : 'default'
                                }
                                sx={{ fontSize: '0.75rem', height: 28 }}
                              />
                            </Box>
                            <Checkbox
                              size="small"
                              checked={selectedRequestIds.has(request.id)}
                              onChange={() => onToggleRequestSelection(request.id)}
                              disabled={!canManageConnectors}
                              sx={{ p: 0.5 }}
                            />
                          </Box>

                          {request.request_comment && (
                            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                <strong>Comment:</strong> {request.request_comment}
                              </Typography>
                            </Box>
                          )}

                          {request.status === 'PENDING' && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => onConnectorRequestDecision(request, 'grant')}
                                disabled={requestBusyId === request.id}
                                fullWidth
                                sx={{ fontSize: '0.8rem', py: 0.75 }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => onConnectorRequestDecision(request, 'deny')}
                                disabled={requestBusyId === request.id}
                                fullWidth
                                sx={{ fontSize: '0.8rem', py: 0.75 }}
                              >
                                Reject
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          )}
        </div>
        <CommonSnackbar
          open={snackbar.open}
          onClose={closeSnackbar}
          message={snackbar.message}
          severity={snackbar.severity}
        />

        {/* Connector Details Popup */}
        <Dialog 
          open={!!selectedConnectorForView} 
          onClose={() => setSelectedConnectorForView(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Connector Details
            <IconButton
              aria-label="close"
              onClick={() => setSelectedConnectorForView(null)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            {selectedConnectorForView && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                {/* Header Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 64,
                      height: 64,
                      fontSize: '1.5rem'
                    }}
                  >
                    {selectedConnectorForView.logo_url ? (
                      <img src={selectedConnectorForView.logo_url} alt={selectedConnectorForView.name} style={{ width: 32, height: 32 }} />
                    ) : (
                      <ElectricalServicesIcon fontSize="large" />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                      {selectedConnectorForView.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={selectedConnectorForView.connector_id || selectedConnectorForView.id}
                        variant="outlined"
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                      <Chip 
                        label={selectedConnectorForView.type || selectedConnectorForView.category || 'Unknown'}
                        color="primary"
                        variant="filled"
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Details Grid */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <InfoIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Connector ID
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {selectedConnectorForView.connector_id || selectedConnectorForView.id}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CategoryIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Type/Category
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedConnectorForView.type || selectedConnectorForView.category || 'Not specified'}
                    </Typography>
                  </Grid>

                  {selectedConnectorForView.external_url && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <LinkIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Documentation
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        startIcon={<LaunchIcon />}
                        href={selectedConnectorForView.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                      >
                        View Documentation
                      </Button>
                    </Grid>
                  )}

                  {selectedConnectorForView.description && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <InfoIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Description
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                        {selectedConnectorForView.description}
                      </Typography>
                    </Grid>
                  )}

                  {selectedConnectorForView.created_at && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Created
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(selectedConnectorForView.created_at).toLocaleString()}
                      </Typography>
                    </Grid>
                  )}

                  {selectedConnectorForView.updated_at && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <RefreshIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Last Updated
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {new Date(selectedConnectorForView.updated_at).toLocaleString()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setSelectedConnectorForView(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };
}

export default EnhancedConnectorManagement
