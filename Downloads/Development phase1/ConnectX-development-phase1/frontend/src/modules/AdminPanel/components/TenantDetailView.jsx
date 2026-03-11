import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  Card,
  CardContent,
  TextField,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  PersonRemove as PersonRemoveIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  ElectricalServices as ElectricalServicesIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import UserManagement from './UserManagement';
import EnhancedConnectorManagement from './EnhancedConnectorManagement';

const TenantDetailView = ({ 
  selectedCompany, 
  isSuper, 
  detailTab, 
  users, 
  adminUser, 
  connectorLoading, 
  tenantLoading, 
  lastRefreshedAt, 
  companyNameDraft, 
  onBackToCompanies, 
  onBackToLanding, 
  onRefreshTenantData, 
  onCopyTenantId, 
  onDetailTabChange, 
  onCompanyNameDraftChange, 
  onSaveName, 
  onDeleteCompany, 
  onRemoveAdmin,
  onUsersUpdate,
  onConnectorsUpdate,
  currentTenant,
  catalogById,
  // Connector management props
  purchasedCatalog,
  marketplaceCatalog,
  filteredPurchasedCatalog,
  filteredMarketplaceCatalog,
  selectedMarketConns,
  selectedPurchasedConns,
  connectorRequests,
  filteredConnectorRequests,
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
}) => {
  // Redirect regular admins away from connectors tab
  useEffect(() => {
    if (!isSuper && detailTab === 'connectors') {
      onDetailTabChange('admin');
    }
  }, [isSuper, detailTab, onDetailTabChange]);

  return (
    <Box sx={{ p: 2, maxWidth: '1400px', margin: '0 auto' }}>
      {/* Modern Header Section */}
      <Card sx={{ mb: 3, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ mb: 2 }}>
            {!isSuper && (
              <Link 
                component="button" 
                variant="body2" 
                onClick={onBackToLanding}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                <ArrowBackIcon fontSize="small" />
                Dashboard
              </Link>
            )}
            {isSuper && (
              <Link 
                component="button" 
                variant="body2" 
                onClick={onBackToCompanies}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                <ArrowBackIcon fontSize="small" />
                Companies
              </Link>
            )}
            <Typography variant="body2" color="text.primary" fontWeight={500}>
              {selectedCompany?.name || 'Your Company'}
            </Typography>
          </Breadcrumbs>

          {/* Company Info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                Company Details
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    Tenant ID:
                  </Typography>
                  <Chip 
                    label={selectedCompany?.id || currentTenant} 
                    variant="outlined" 
                    size="small"
                    sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 500 }}
                  />
                  <IconButton size="small" onClick={onCopyTenantId} sx={{ p: 0.5 }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
                {lastRefreshedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last refreshed: {new Date(lastRefreshedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onRefreshTenantData}
                disabled={tenantLoading}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Modern Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={detailTab} 
          onChange={(e, newValue) => onDetailTabChange(newValue)}
          aria-label="company detail tabs"
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
          <Tab value="admin" label="Admin Details" icon={<SettingsIcon />} iconPosition="start" />
          <Tab value="users" label="Users" icon={<PeopleIcon />} iconPosition="start" />
          {isSuper && <Tab value="connectors" label="Connectors" icon={<ElectricalServicesIcon />} iconPosition="start" />}
        </Tabs>
      </Box>

      {/* Admin Details Tab */}
      {detailTab === 'admin' && (
        <Box>
          {/* Admin Details Header */}
          <Card sx={{ mb: 3, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>Admin Details</Typography>
                {isSuper && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Delete Company">
                      <IconButton 
                        color="error" 
                        onClick={onDeleteCompany}
                        sx={{ p: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    {adminUser && (
                      <Tooltip title="Remove Admin">
                        <IconButton 
                          color="error" 
                          onClick={onRemoveAdmin}
                          sx={{ p: 1 }}
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Admin Details Content */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Company Settings
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Company Name"
                      value={companyNameDraft}
                      onChange={(e) => onCompanyNameDraftChange(e.target.value)}
                      placeholder="Enter company name"
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={!isSuper}
                      helperText={!isSuper ? "Company name cannot be changed by admins" : ""}
                    />
                    {isSuper && (
                    <Button 
                      variant="contained" 
                      startIcon={<SaveIcon />}
                      onClick={onSaveName}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Save Name
                    </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Admin Users ({users.filter(u => u.role === 'ADMIN').length})
                  </Typography>
                  {users.filter(u => u.role === 'ADMIN').length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {users.filter(u => u.role === 'ADMIN').map((admin, index) => (
                        <Box 
                          key={admin.id} 
                          sx={{ 
                            p: 2, 
                            border: 1, 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            backgroundColor: index === 0 ? 'primary.50' : 'transparent'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'primary.main',
                                width: 32,
                                height: 32,
                                fontSize: '0.875rem'
                              }}
                            >
                              {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : admin.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                sx={{ mb: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}
                                component="span"
                              >
                                {admin.full_name || 'No Name'}
                                {index === 0 && (
                                  <Chip 
                                    label="Primary" 
                                    size="small" 
                                    color="primary" 
                                    variant="filled"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}>
                                {admin.email}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={admin.role} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                            <Chip 
                              label={admin.is_active ? 'Active' : 'Inactive'} 
                              size="small" 
                              color={admin.is_active ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                            {admin.created_at && (
                              <Chip 
                                label={`Created ${new Date(admin.created_at).toLocaleDateString()}`}
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Avatar sx={{ 
                        bgcolor: 'grey.300', 
                        width: 48, 
                        height: 48, 
                        margin: '0 auto 16px',
                        fontSize: '1.5rem' 
                      }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No admin users found
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => setDetailTab('users')}
                      >
                        Manage Users
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Users Tab */}
      {detailTab === 'users' && (
        <Box sx={{ p: 2 }}>
          {tenantLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <UserManagement
              users={users}
              onUpdate={onUsersUpdate}
              onRefreshUsers={onRefreshTenantData}
              currentTenant={selectedCompany?.id || currentTenant}
              token={token}
              adminUser={adminUser}
              isSuper={isSuper}
            />
          )}
        </Box>
      )}

      {/* Connectors Tab */}
      {isSuper && detailTab === 'connectors' && (
        <Box sx={{ p: 2 }}>
          {connectorLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <EnhancedConnectorManagement
              users={users}
              purchasedCatalog={purchasedCatalog}
              marketplaceCatalog={marketplaceCatalog}
              filteredPurchasedCatalog={filteredPurchasedCatalog}
              filteredMarketplaceCatalog={filteredMarketplaceCatalog}
              selectedMarketConns={selectedMarketConns}
              selectedPurchasedConns={selectedPurchasedConns}
              connectorRequests={connectorRequests}
              filteredConnectorRequests={filteredConnectorRequests}
              connectorLoading={connectorLoading}
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
              currentTenant={selectedCompany?.id || currentTenant}
              token={token}
              catalogById={catalogById}
              onConnectorSubTabChange={onConnectorSubTabChange}
              onConnectorSearchChange={onConnectorSearchChange}
              onConnectorTypeFilterChange={onConnectorTypeFilterChange}
              onConnectorSortChange={onConnectorSortChange}
              onConnectorDensityChange={onConnectorDensityChange}
              onNotificationSearchChange={onNotificationSearchChange}
              onNotificationStatusFilterChange={onNotificationStatusFilterChange}
              onNotificationSortChange={onNotificationSortChange}
              onToggleMarketplaceSelection={onToggleMarketplaceSelection}
              onTogglePurchasedSelection={onTogglePurchasedSelection}
              onSelectAllFilteredMarketplace={onSelectAllFilteredMarketplace}
              onSelectAllFilteredPrebuilt={onSelectAllFilteredPrebuilt}
              onClearMarketplaceSelection={onClearMarketplaceSelection}
              onClearPrebuiltSelection={onClearPrebuiltSelection}
              onPurchaseSelectedConnectors={onPurchaseSelectedConnectors}
              onMoveSelectedToMarketplace={onMoveSelectedToMarketplace}
              onConnectorRequestDecision={onConnectorRequestDecision}
              onToggleRequestSelection={onToggleRequestSelection}
              onSelectAllPendingRequests={onSelectAllPendingRequests}
              onClearSelectedRequests={onClearSelectedRequests}
              onBulkConnectorRequestDecision={onBulkConnectorRequestDecision}
              selectedRequestIds={selectedRequestIds}
              onConnectorsUpdate={onConnectorsUpdate}
              onRefreshData={onRefreshTenantData}
              onMarketplaceUpdate={onRefreshTenantData}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default TenantDetailView;
