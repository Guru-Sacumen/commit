import React, { useState, useEffect } from 'react';
import { useAuth } from '../../common/hooks/useAuth';
import { Eye, Trash2 } from 'lucide-react';
import {
  connectorMatchesFilters,
  sortConnectorsByName,
  csvEscape,
  downloadCsv,
} from '../../modules/AdminPanel/utils/adminUtils';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  ElectricalServices as ElectricalServicesIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  Link as LinkIcon,
  Launch as LaunchIcon,
  CalendarToday as CalendarTodayIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const AdminMarketplace = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('connectx_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  
  const [connectorCatalog, setConnectorCatalog] = useState([]);
  const [connectorSearch, setConnectorSearch] = useState('');
  const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
  const [connectorSort, setConnectorSort] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddConnectorForm, setShowAddConnectorForm] = useState(false);
  const [showEditConnectorForm, setShowEditConnectorForm] = useState(false);
  const [editingConnector, setEditingConnector] = useState(null);
  const [editDialogInitialized, setEditDialogInitialized] = useState(false);
  const [connectorForm, setConnectorForm] = useState({
    name: '',
    connector_id: '',
    category: '',
    usecase: '',
  });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const marketplaceCatalog = connectorCatalog; // All connectors are marketplace for superadmin view
  
  const connectorTypeOptions = (() => {
    // Use categories loaded from backend instead of deriving from catalog
    if (categories.length > 0) {
      const categoryNames = categories.map(cat => cat.name || '');
      return ['ALL', ...categoryNames.sort((a, b) => String(a || '').localeCompare(String(b || '')))];
    }
    // Fallback to catalog if categories not loaded yet
    const options = new Set(
      connectorCatalog.map((connector) => connector.type || 'Unknown'),
    );
    return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
  })();
  
  const filteredMarketplaceCatalog = (() =>
    sortConnectorsByName(
      marketplaceCatalog.filter((connector) =>
        connectorMatchesFilters(
          connector,
          connectorSearch,
          connectorTypeFilter,
        ),
      ),
      connectorSort,
    )
  )();

  // Fetch connector catalog from real endpoint
  useEffect(() => {
    const fetchConnectorCatalog = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        setError('');
        
        const catalogRes = await fetch(`${API_BASE_URL}/connectors/catalog`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!catalogRes.ok) {
          throw new Error('Failed to fetch connector catalog');
        }
        
        const catalogData = await catalogRes.json();
        setConnectorCatalog(catalogData);
      } catch (error) {
        console.error('Error fetching connector catalog:', error);
        setError('Unable to load connector catalog.');
      } finally {
        setLoading(false);
      }
    };

    fetchConnectorCatalog();
  }, [token, API_BASE_URL]);

  // Fetch categories from backend
  const fetchCategories = async () => {
    if (!token) return Promise.resolve();
    
    try {
      setCategoriesLoading(true);
      
      const categoriesRes = await fetch(`${API_BASE_URL}/integration/connectors/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!categoriesRes.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData);
      return Promise.resolve(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return Promise.reject(error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch categories when component mounts or when add/edit connector form is opened
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, token, API_BASE_URL]);

  useEffect(() => {
    if ((showAddConnectorForm || showEditConnectorForm) && categories.length === 0) {
      fetchCategories();
    }
  }, [showAddConnectorForm, showEditConnectorForm, categories.length, token, API_BASE_URL]);

  // Ensure category is properly set when editing connector and categories are loaded
  useEffect(() => {
    if (editingConnector && categories.length > 0 && showEditConnectorForm && !editDialogInitialized) {
      // Check if the current category matches any available category
      const currentCategory = editingConnector.type || '';
      const categoryExists = categories.some(cat => cat.name === currentCategory);
      
      if (categoryExists) {
        setConnectorForm(prev => ({ ...prev, category: currentCategory }));
        setEditDialogInitialized(true);
      }
    }
  }, [editingConnector, categories, showEditConnectorForm, editDialogInitialized]);

  const handleViewConnector = (connector) => {
    setSelectedConnector(connector);
    setShowViewModal(true);
  };

  const handleDeleteConnector = async (connector) => {
    if (!window.confirm(`Are you sure you want to delete "${connector.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/connectors/catalog/${connector.connector_id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete connector');
      }

      // Remove connector from local state
      setConnectorCatalog(prev => prev.filter(c => c.connector_id !== connector.connector_id));
      
      // Close view modal if it's open for this connector
      if (selectedConnector?.connector_id === connector.connector_id) {
        setShowViewModal(false);
        setSelectedConnector(null);
      }

      // TODO: Add success notification
      console.log('Connector deleted successfully');
    } catch (error) {
      console.error('Error deleting connector:', error);
      // TODO: Add error notification
    }
  };

  const handleEditConnector = (connector) => {
    setEditingConnector(connector);
    
    // Set form data
    const formData = {
      name: connector.name || '',
      connector_id: connector.connector_id || '',
      category: connector.type || '', // Map type to category for editing
      usecase: connector.usecase || '',
    };
    
    // If categories are already loaded, set the form immediately
    if (categories.length > 0) {
      setConnectorForm(formData);
      setShowEditConnectorForm(true);
    } else {
      // If categories need to be loaded, set form after loading
      fetchCategories().then(() => {
        setConnectorForm(formData);
        setShowEditConnectorForm(true);
      });
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedConnector(null);
  };

  const closeEditModal = () => {
    setShowEditConnectorForm(false);
    setEditingConnector(null);
    setEditDialogInitialized(false);
    resetConnectorForm();
  };

  const handleUpdateConnector = async (e) => {
    e.preventDefault();
    if (!connectorForm.name || !connectorForm.connector_id || !connectorForm.category) {
      console.error('Connector name, ID, and category are required');
      return;
    }

    try {
      const payload = {
        name: connectorForm.name,
        type: connectorForm.category,
        usecase: connectorForm.usecase || null,
      };

      const res = await fetch(`${API_BASE_URL}/connectors/catalog/${editingConnector.connector_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update connector');
      }

      const updated = await res.json();
      setConnectorCatalog(prev => 
        prev.map(connector => 
          connector.id === updated.id ? updated : connector
        )
      );
      closeEditModal();
      // TODO: Add success notification
    } catch (error) {
      console.error('Error updating connector:', error);
      // TODO: Add error notification
    }
  };

  const exportConnectorSnapshot = () => {
    const rows = connectorCatalog.map((connector) => [
      'Marketplace',
      connector.id,
      connector.name,
      connector.type,
    ]);
    downloadCsv(
      `connector-marketplace-snapshot.csv`,
      ['Section', 'Connector ID', 'Name', 'Type'],
      rows,
    );
  };

  const resetConnectorForm = () => {
    setConnectorForm({
      name: '',
      connector_id: '',
      category: '',
      usecase: '',
    });
    setShowAddConnectorForm(false);
  };

  const handleAddConnector = async (e) => {
    e.preventDefault();
    if (!connectorForm.name || !connectorForm.connector_id || !connectorForm.category) {
      // TODO: Add proper error handling
      console.error('Connector name, ID, and category are required');
      return;
    }

    try {
      const payload = {
        connector_id: connectorForm.connector_id,
        name: connectorForm.name,
        type: connectorForm.category, // Use category selection as the connector type
        usecase: connectorForm.usecase || null,
      };

      const res = await fetch(`${API_BASE_URL}/connectors/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to add connector');
      }

      const created = await res.json();
      setConnectorCatalog(prev => [...prev, created]);
      resetConnectorForm();
      // TODO: Add success notification
    } catch (error) {
      console.error('Error adding connector:', error);
      // TODO: Add error notification
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Loading Connector Marketplace...</h2>
          <p className="text-gray-600">Please wait while we fetch the available connectors.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-red-900 mb-2">Error Loading Marketplace</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connector Marketplace</h1>
            <p className="text-gray-600">Browse and manage available connectors for your integration needs</p>
          </div>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ElectricalServicesIcon />}
              onClick={() => setShowAddConnectorForm(true)}
            >
              + Add Connector
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={exportConnectorSnapshot}
            >
              📊 Export
            </Button>
          </Box>
        </div>
      </div>

      {/* Connector Toolbar - Exact same as Companies page */}
      <div className="connector-toolbar pl-2 mb-6">
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
      </div>

      {/* Connector Grid Layout - Exact same as Companies page */}
      <div className="connector-grid-layout">
        <section className="connector-card-panel">
          <div className="connector-panel-head">
            <div className="connector-panel-actions">
              {/* Actions can be added here if needed */}
            </div>
          </div>
          <div className="connector-card-grid">
            {filteredMarketplaceCatalog.length === 0 ? (
              <div className="connector-empty w-full">
                <ElectricalServicesIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No connectors available.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filters or add a new connector to get started.
                </Typography>
              </div>
            ) : (
              filteredMarketplaceCatalog.map((connector) => (
                <div
                  key={connector.id}
                  className="connector-grid-card"
                >
                  <div className="connector-actions">
                    <button
                      type="button"
                      onClick={() => handleEditConnector(connector)}
                      className="connector-action-btn edit-btn"
                      title="Edit connector"
                    >
                      <EditIcon style={{ fontSize: 16 }} />
                    </button>
                  </div>
                  <div className="connector-grid-name">
                    {connector.name}
                  </div>
                  <div className="connector-grid-type">
                    {connector.type}
                  </div>
                  <div className="connector-grid-id">{connector.id}</div>
                  <div className="connector-actions-bottom">
                    <button
                      type="button"
                      onClick={() => handleViewConnector(connector)}
                      className="connector-action-btn view-btn"
                      title="View connector details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteConnector(connector)}
                      className="connector-action-btn delete-btn"
                      title="Delete connector"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Connector Details Popup - Same as Companies page */}
      <Dialog 
        open={!!selectedConnector} 
        onClose={closeViewModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Connector Details
          <IconButton
            aria-label="close"
            onClick={closeViewModal}
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
          {selectedConnector && (
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
                  {selectedConnector.logo_url ? (
                    <img src={selectedConnector.logo_url} alt={selectedConnector.name} style={{ width: 32, height: 32 }} />
                  ) : (
                    <ElectricalServicesIcon fontSize="large" />
                  )}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                    {selectedConnector.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={selectedConnector.id}
                      variant="outlined"
                      size="small"
                      sx={{ fontFamily: 'monospace' }}
                    />
                    <Chip 
                      label={selectedConnector.type || 'Unknown'}
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
                    {selectedConnector.id}
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
                    {selectedConnector.type || 'Not specified'}
                  </Typography>
                </Grid>

                {selectedConnector.external_url && (
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
                      href={selectedConnector.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      View Documentation
                    </Button>
                  </Grid>
                )}

                {selectedConnector.usecase && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <InfoIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Use Case
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 2, 
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {selectedConnector.usecase}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {selectedConnector.description && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <InfoIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Description
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {selectedConnector.description}
                    </Typography>
                  </Grid>
                )}

                {selectedConnector.created_at && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CalendarTodayIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedConnector.created_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}

                {selectedConnector.updated_at && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <RefreshIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedConnector.updated_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={closeViewModal}>
            Close
          </Button>
          <Button 
            onClick={() => selectedConnector && handleDeleteConnector(selectedConnector)}
            variant="outlined"
            color="error"
            startIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Connector
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Connector Dialog */}
      <Dialog
        open={showAddConnectorForm}
        onClose={resetConnectorForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add Custom Connector
          <IconButton
            aria-label="close"
            onClick={resetConnectorForm}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size="small"
              label="Connector Name *"
              placeholder="My Custom Connector"
              value={connectorForm.name}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              size="small"
              label="Connector ID *"
              placeholder="my-custom-connector"
              value={connectorForm.connector_id}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, connector_id: e.target.value }))}
              required
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category *</InputLabel>
              <Select
                value={connectorForm.category}
                onChange={(e) => setConnectorForm(prev => ({ ...prev, category: e.target.value }))}
                displayEmpty
                label="Category *"
              >
      
                {categoriesLoading ? (
                  <MenuItem disabled>
                    <em>Loading categories...</em>
                  </MenuItem>
                ) : (
                  categories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Use Case"
              placeholder="Describe the use case for this connector..."
              value={connectorForm.usecase}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, usecase: e.target.value }))}
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetConnectorForm} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleAddConnector}
            variant="contained"
            size="small"
          >
            Add Connector
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Connector Dialog */}
      <Dialog
        open={showEditConnectorForm}
        onClose={closeEditModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Connector
          <IconButton
            aria-label="close"
            onClick={closeEditModal}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size="small"
              label="Connector Name *"
              placeholder="My Custom Connector"
              value={connectorForm.name}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              size="small"
              label="Connector ID *"
              placeholder="my-custom-connector"
              value={connectorForm.connector_id}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, connector_id: e.target.value }))}
              required
              fullWidth
              disabled
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category *</InputLabel>
              <Select
                value={connectorForm.category}
                onChange={(e) => setConnectorForm(prev => ({ ...prev, category: e.target.value }))}
                displayEmpty
                label="Category *"
              >
                <MenuItem value="">
                  <em>Select a category...</em>
                </MenuItem>
                {categoriesLoading ? (
                  <MenuItem disabled>
                    <em>Loading categories...</em>
                  </MenuItem>
                ) : (
                  categories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Use Case"
              placeholder="Describe the use case for this connector..."
              value={connectorForm.usecase}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, usecase: e.target.value }))}
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditModal} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleUpdateConnector}
            variant="contained"
            size="small"
          >
            Update Connector
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminMarketplace;
