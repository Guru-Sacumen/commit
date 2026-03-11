// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../../common/hooks/useAuth';
// import { Eye, Trash2 } from 'lucide-react';
// import {
//   connectorMatchesFilters,
//   sortConnectorsByName,
//   csvEscape,
//   downloadCsv,
// } from '../../modules/AdminPanel/utils/adminUtils';
// import {
//   Box,
//   Typography,
//   Avatar,
//   Chip,
//   IconButton,
//   Grid,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
// } from '@mui/material';
// import {
//   Close as CloseIcon,
//   Visibility as VisibilityIcon,
//   Edit as EditIcon,
//   ElectricalServices as ElectricalServicesIcon,
//   Info as InfoIcon,
//   Category as CategoryIcon,
//   Link as LinkIcon,
//   Launch as LaunchIcon,
//   CalendarToday as CalendarTodayIcon,
//   Refresh as RefreshIcon,
// } from '@mui/icons-material';

// const AdminMarketplace = () => {
//   const { user } = useAuth();
//   const token = localStorage.getItem('connectx_token');
//   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  
//   const [connectorCatalog, setConnectorCatalog] = useState([]);
//   const [connectorSearch, setConnectorSearch] = useState('');
//   const [connectorTypeFilter, setConnectorTypeFilter] = useState('ALL');
//   const [connectorSort, setConnectorSort] = useState('asc');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [selectedConnector, setSelectedConnector] = useState(null);
//   const [showViewModal, setShowViewModal] = useState(false);
//   const [showAddConnectorForm, setShowAddConnectorForm] = useState(false);
//   const [showEditConnectorForm, setShowEditConnectorForm] = useState(false);
//   const [editingConnector, setEditingConnector] = useState(null);
//   const [editDialogInitialized, setEditDialogInitialized] = useState(false);
//   const [connectorForm, setConnectorForm] = useState({
//     name: '',
//     connector_id: '',
//     category: '',
//     usecase: '',
//   });
//   const [categories, setCategories] = useState([]);
//   const [categoriesLoading, setCategoriesLoading] = useState(false);

//   const marketplaceCatalog = connectorCatalog; // All connectors are marketplace for superadmin view
  
//   const connectorTypeOptions = (() => {
//     // Use categories loaded from backend instead of deriving from catalog
//     if (categories.length > 0) {
//       const categoryNames = categories.map(cat => cat.name || '');
//       return ['ALL', ...categoryNames.sort((a, b) => String(a || '').localeCompare(String(b || '')))];
//     }
//     // Fallback to catalog if categories not loaded yet
//     const options = new Set(
//       connectorCatalog.map((connector) => connector.type || 'Unknown'),
//     );
//     return ['ALL', ...Array.from(options).sort((a, b) => String(a || '').localeCompare(String(b || '')))];
//   })();
  
//   const filteredMarketplaceCatalog = (() =>
//     sortConnectorsByName(
//       marketplaceCatalog.filter((connector) =>
//         connectorMatchesFilters(
//           connector,
//           connectorSearch,
//           connectorTypeFilter,
//         ),
//       ),
//       connectorSort,
//     )
//   )();

//   // Fetch connector catalog from real endpoint
//   useEffect(() => {
//     const fetchConnectorCatalog = async () => {
//       if (!token) return;
      
//       try {
//         setLoading(true);
//         setError('');
        
//         const catalogRes = await fetch(`${API_BASE_URL}/connectors/catalog`, {
//           headers: { Authorization: `Bearer ${token}` }
//         });
        
//         if (!catalogRes.ok) {
//           throw new Error('Failed to fetch connector catalog');
//         }
        
//         const catalogData = await catalogRes.json();
//         setConnectorCatalog(catalogData);
//       } catch (error) {
//         console.error('Error fetching connector catalog:', error);
//         setError('Unable to load connector catalog.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchConnectorCatalog();
//   }, [token, API_BASE_URL]);

//   // Fetch categories from backend
//   const fetchCategories = async () => {
//     if (!token) return Promise.resolve();
    
//     try {
//       setCategoriesLoading(true);
      
//       const categoriesRes = await fetch(`${API_BASE_URL}/connectors/categories`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       if (!categoriesRes.ok) {
//         throw new Error('Failed to fetch categories');
//       }
      
//       const categoriesData = await categoriesRes.json();
//       setCategories(categoriesData);
//       return Promise.resolve(categoriesData);
//     } catch (error) {
//       console.error('Error fetching categories:', error);
//       return Promise.reject(error);
//     } finally {
//       setCategoriesLoading(false);
//     }
//   };

//   // Fetch categories when component mounts or when add/edit connector form is opened
//   useEffect(() => {
//     if (categories.length === 0) {
//       fetchCategories();
//     }
//   }, [categories.length, token, API_BASE_URL]);

//   useEffect(() => {
//     if ((showAddConnectorForm || showEditConnectorForm) && categories.length === 0) {
//       fetchCategories();
//     }
//   }, [showAddConnectorForm, showEditConnectorForm, categories.length, token, API_BASE_URL]);

//   // Ensure category is properly set when editing connector and categories are loaded
//   useEffect(() => {
//     if (editingConnector && categories.length > 0 && showEditConnectorForm && !editDialogInitialized) {
//       // Check if the current category matches any available category
//       const currentCategory = editingConnector.type || '';
//       const categoryExists = categories.some(cat => cat.name === currentCategory);
      
//       if (categoryExists) {
//         setConnectorForm(prev => ({ ...prev, category: currentCategory }));
//         setEditDialogInitialized(true);
//       }
//     }
//   }, [editingConnector, categories, showEditConnectorForm, editDialogInitialized]);

//   const handleViewConnector = (connector) => {
//     setSelectedConnector(connector);
//     setShowViewModal(true);
//   };

//   const handleDeleteConnector = async (connector) => {
//     if (!window.confirm(`Are you sure you want to delete "${connector.name}"? This action cannot be undone.`)) {
//       return;
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}/connectors/catalog/${connector.connector_id}`, {
//         method: 'DELETE',
//         headers: { 
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.detail || 'Failed to delete connector');
//       }

//       // Remove connector from local state
//       setConnectorCatalog(prev => prev.filter(c => c.connector_id !== connector.connector_id));
      
//       // Close view modal if it's open for this connector
//       if (selectedConnector?.connector_id === connector.connector_id) {
//         setShowViewModal(false);
//         setSelectedConnector(null);
//       }

//       // TODO: Add success notification
//       console.log('Connector deleted successfully');
//     } catch (error) {
//       console.error('Error deleting connector:', error);
//       // TODO: Add error notification
//     }
//   };

//   const handleEditConnector = (connector) => {
//     setEditingConnector(connector);
    
//     // Set form data
//     const formData = {
//       name: connector.name || '',
//       connector_id: connector.connector_id || '',
//       category: connector.type || '', // Map type to category for editing
//       usecase: connector.usecase || '',
//     };
    
//     // If categories are already loaded, set the form immediately
//     if (categories.length > 0) {
//       setConnectorForm(formData);
//       setShowEditConnectorForm(true);
//     } else {
//       // If categories need to be loaded, set form after loading
//       fetchCategories().then(() => {
//         setConnectorForm(formData);
//         setShowEditConnectorForm(true);
//       });
//     }
//   };

//   const closeViewModal = () => {
//     setShowViewModal(false);
//     setSelectedConnector(null);
//   };

//   const closeEditModal = () => {
//     setShowEditConnectorForm(false);
//     setEditingConnector(null);
//     setEditDialogInitialized(false);
//     resetConnectorForm();
//   };

//   const handleUpdateConnector = async (e) => {
//     e.preventDefault();
//     if (!connectorForm.name || !connectorForm.connector_id || !connectorForm.category) {
//       console.error('Connector name, ID, and category are required');
//       return;
//     }

//     try {
//       const payload = {
//         name: connectorForm.name,
//         type: connectorForm.category,
//         usecase: connectorForm.usecase || null,
//       };

//       const res = await fetch(`${API_BASE_URL}/connectors/catalog/${editingConnector.connector_id}`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         throw new Error('Failed to update connector');
//       }

//       const updated = await res.json();
//       setConnectorCatalog(prev => 
//         prev.map(connector => 
//           connector.id === updated.id ? updated : connector
//         )
//       );
//       closeEditModal();
//       // TODO: Add success notification
//     } catch (error) {
//       console.error('Error updating connector:', error);
//       // TODO: Add error notification
//     }
//   };

//   const exportConnectorSnapshot = () => {
//     const rows = connectorCatalog.map((connector) => [
//       'Marketplace',
//       connector.id,
//       connector.name,
//       connector.type,
//     ]);
//     downloadCsv(
//       `connector-marketplace-snapshot.csv`,
//       ['Section', 'Connector ID', 'Name', 'Type'],
//       rows,
//     );
//   };

//   const resetConnectorForm = () => {
//     setConnectorForm({
//       name: '',
//       connector_id: '',
//       category: '',
//       usecase: '',
//     });
//     setShowAddConnectorForm(false);
//   };

//   const handleAddConnector = async (e) => {
//     e.preventDefault();
//     if (!connectorForm.name || !connectorForm.connector_id || !connectorForm.category) {
//       // TODO: Add proper error handling
//       console.error('Connector name, ID, and category are required');
//       return;
//     }

//     try {
//       const payload = {
//         connector_id: connectorForm.connector_id,
//         name: connectorForm.name,
//         type: connectorForm.category, // Use category selection as the connector type
//         usecase: connectorForm.usecase || null,
//       };

//       const res = await fetch(`${API_BASE_URL}/connectors/catalog`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         throw new Error('Failed to add connector');
//       }

//       const created = await res.json();
//       setConnectorCatalog(prev => [...prev, created]);
//       resetConnectorForm();
//       // TODO: Add success notification
//     } catch (error) {
//       console.error('Error adding connector:', error);
//       // TODO: Add error notification
//     }
//   };

//   if (loading) {
//     return (
//       <div className="w-full">
//         <div className="text-center py-12">
//           <h2 className="text-xl font-medium text-gray-900 mb-2">Loading Connector Marketplace...</h2>
//           <p className="text-gray-600">Please wait while we fetch the available connectors.</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="w-full">
//         <div className="text-center py-12">
//           <h2 className="text-xl font-medium text-red-900 mb-2">Error Loading Marketplace</h2>
//           <p className="text-red-600">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       <div className="mb-8">
//         <div className="flex justify-between items-start mb-4">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">Connector Marketplace</h1>
//             <p className="text-gray-600">Browse and manage available connectors for your integration needs</p>
//           </div>
//           <Box sx={{ display: "flex", gap: 1 }}>
//             <Button
//               variant="outlined"
//               size="small"
//               startIcon={<ElectricalServicesIcon />}
//               onClick={() => setShowAddConnectorForm(true)}
//             >
//               + Add Connector
//             </Button>
//             <Button
//               variant="outlined"
//               size="small"
//               onClick={exportConnectorSnapshot}
//             >
//               📊 Export
//             </Button>
//           </Box>
//         </div>
//       </div>

//       {/* Connector Toolbar - Exact same as Companies page */}
//       <div className="connector-toolbar pl-2 mb-6">
//         <label>
//           Search Connectors
//           <input
//             type="search"
//             placeholder="Search by connector name, type, or id"
//             value={connectorSearch}
//             onChange={(e) => setConnectorSearch(e.target.value)}
//           />
//         </label>
//         <label>
//           Type
//           <select
//             value={connectorTypeFilter}
//             onChange={(e) => setConnectorTypeFilter(e.target.value)}
//           >
//             {connectorTypeOptions.map((type) => (
//               <option key={type} value={type}>
//                 {type === 'ALL' ? 'All Types' : type}
//               </option>
//             ))}
//           </select>
//         </label>
//         <label>
//           Sort
//           <select
//             value={connectorSort}
//             onChange={(e) => setConnectorSort(e.target.value)}
//           >
//             <option value="asc">A → Z</option>
//             <option value="desc">Z → A</option>
//           </select>
//         </label>
//       </div>

//       {/* Connector Grid Layout - Exact same as Companies page */}
//       <div className="connector-grid-layout">
//         <section className="connector-card-panel">
//           <div className="connector-panel-head">
//             <div className="connector-panel-actions">
//               {/* Actions can be added here if needed */}
//             </div>
//           </div>
//           <div className="connector-card-grid">
//             {filteredMarketplaceCatalog.length === 0 ? (
//               <div className="connector-empty w-full">
//                 <ElectricalServicesIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
//                 <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
//                   No connectors available.
//                 </Typography>
//                 <Typography variant="body2" color="text.secondary">
//                   Try adjusting your filters or add a new connector to get started.
//                 </Typography>
//               </div>
//             ) : (
//               filteredMarketplaceCatalog.map((connector) => (
//                 <div
//                   key={connector.id}
//                   className="connector-grid-card"
//                 >
//                   <div className="connector-actions">
//                     <button
//                       type="button"
//                       onClick={() => handleEditConnector(connector)}
//                       className="connector-action-btn edit-btn"
//                       title="Edit connector"
//                     >
//                       <EditIcon style={{ fontSize: 16 }} />
//                     </button>
//                   </div>
//                   <div className="connector-grid-name">
//                     {connector.name}
//                   </div>
//                   <div className="connector-grid-type">
//                     {connector.type}
//                   </div>
//                   <div className="connector-grid-id">{connector.id}</div>
//                   <div className="connector-actions-bottom">
//                     <button
//                       type="button"
//                       onClick={() => handleViewConnector(connector)}
//                       className="connector-action-btn view-btn"
//                       title="View connector details"
//                     >
//                       <Eye className="w-4 h-4" />
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => handleDeleteConnector(connector)}
//                       className="connector-action-btn delete-btn"
//                       title="Delete connector"
//                     >
//                       <Trash2 className="w-4 h-4" />
//                     </button>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </section>
//       </div>

//       {/* Connector Details Popup - Same as Companies page */}
//       <Dialog 
//         open={!!selectedConnector} 
//         onClose={closeViewModal}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle>
//           Connector Details
//           <IconButton
//             aria-label="close"
//             onClick={closeViewModal}
//             sx={{
//               position: 'absolute',
//               right: 8,
//               top: 8,
//               color: (theme) => theme.palette.grey[500],
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
        
//         <DialogContent>
//           {selectedConnector && (
//             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
//               {/* Header Section */}
//               <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
//                 <Avatar
//                   sx={{
//                     bgcolor: 'primary.main',
//                     width: 64,
//                     height: 64,
//                     fontSize: '1.5rem'
//                   }}
//                 >
//                   {selectedConnector.logo_url ? (
//                     <img src={selectedConnector.logo_url} alt={selectedConnector.name} style={{ width: 32, height: 32 }} />
//                   ) : (
//                     <ElectricalServicesIcon fontSize="large" />
//                   )}
//                 </Avatar>
//                 <Box sx={{ flex: 1 }}>
//                   <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
//                     {selectedConnector.name}
//                   </Typography>
//                   <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
//                     <Chip 
//                       label={selectedConnector.id}
//                       variant="outlined"
//                       size="small"
//                       sx={{ fontFamily: 'monospace' }}
//                     />
//                     <Chip 
//                       label={selectedConnector.type || 'Unknown'}
//                       color="primary"
//                       variant="filled"
//                       size="small"
//                     />
//                   </Box>
//                 </Box>
//               </Box>

//               {/* Details Grid */}
//               <Grid container spacing={2}>
//                 <Grid item xs={12} sm={6}>
//                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                     <InfoIcon fontSize="small" color="action" />
//                     <Typography variant="body2" color="text.secondary">
//                       Connector ID
//                     </Typography>
//                   </Box>
//                   <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.9rem' }}>
//                     {selectedConnector.id}
//                   </Typography>
//                 </Grid>

//                 <Grid item xs={12} sm={6}>
//                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                     <CategoryIcon fontSize="small" color="action" />
//                     <Typography variant="body2" color="text.secondary">
//                       Type/Category
//                     </Typography>
//                   </Box>
//                   <Typography variant="body1" sx={{ mb: 2 }}>
//                     {selectedConnector.type || 'Not specified'}
//                   </Typography>
//                 </Grid>

//                 {selectedConnector.external_url && (
//                   <Grid item xs={12}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                       <LinkIcon fontSize="small" color="action" />
//                       <Typography variant="body2" color="text.secondary">
//                         Documentation
//                       </Typography>
//                     </Box>
//                     <Button
//                       variant="outlined"
//                       startIcon={<LaunchIcon />}
//                       href={selectedConnector.external_url}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       size="small"
//                     >
//                       View Documentation
//                     </Button>
//                   </Grid>
//                 )}

//                 {selectedConnector.usecase && (
//                   <Grid item xs={12}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                       <InfoIcon fontSize="small" color="action" />
//                       <Typography variant="body2" color="text.secondary">
//                         Use Case
//                       </Typography>
//                     </Box>
//                     <Box sx={{ 
//                       p: 2, 
//                       bgcolor: 'grey.50', 
//                       borderRadius: 2, 
//                       border: '1px solid',
//                       borderColor: 'grey.200'
//                     }}>
//                       <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
//                         {selectedConnector.usecase}
//                       </Typography>
//                     </Box>
//                   </Grid>
//                 )}

//                 {selectedConnector.description && (
//                   <Grid item xs={12}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                       <InfoIcon fontSize="small" color="action" />
//                       <Typography variant="body2" color="text.secondary">
//                         Description
//                       </Typography>
//                     </Box>
//                     <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
//                       {selectedConnector.description}
//                     </Typography>
//                   </Grid>
//                 )}

//                 {selectedConnector.created_at && (
//                   <Grid item xs={12} sm={6}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                       <CalendarTodayIcon fontSize="small" color="action" />
//                       <Typography variant="body2" color="text.secondary">
//                         Created
//                       </Typography>
//                     </Box>
//                     <Typography variant="body1" sx={{ mb: 2 }}>
//                       {new Date(selectedConnector.created_at).toLocaleString()}
//                     </Typography>
//                   </Grid>
//                 )}

//                 {selectedConnector.updated_at && (
//                   <Grid item xs={12} sm={6}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
//                       <RefreshIcon fontSize="small" color="action" />
//                       <Typography variant="body2" color="text.secondary">
//                         Last Updated
//                       </Typography>
//                     </Box>
//                     <Typography variant="body1" sx={{ mb: 2 }}>
//                       {new Date(selectedConnector.updated_at).toLocaleString()}
//                     </Typography>
//                   </Grid>
//                 )}
//               </Grid>
//             </Box>
//           )}
//         </DialogContent>
        
//         <DialogActions sx={{ p: 3, pt: 0 }}>
//           <Button onClick={closeViewModal}>
//             Close
//           </Button>
//           <Button 
//             onClick={() => selectedConnector && handleDeleteConnector(selectedConnector)}
//             variant="outlined"
//             color="error"
//             startIcon={<Trash2 className="w-4 h-4" />}
//           >
//             Delete Connector
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Add Connector Dialog */}
//       <Dialog
//         open={showAddConnectorForm}
//         onClose={resetConnectorForm}
//         maxWidth="sm"
//         fullWidth
//       >
//         <DialogTitle>
//           Add Custom Connector
//           <IconButton
//             aria-label="close"
//             onClick={resetConnectorForm}
//             sx={{
//               position: 'absolute',
//               right: 8,
//               top: 8,
//               color: (theme) => theme.palette.grey[500],
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent>
//           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
//             <TextField
//               size="small"
//               label="Connector Name *"
//               placeholder="My Custom Connector"
//               value={connectorForm.name}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, name: e.target.value }))}
//               required
//               fullWidth
//             />
//             <TextField
//               size="small"
//               label="Connector ID *"
//               placeholder="my-custom-connector"
//               value={connectorForm.connector_id}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, connector_id: e.target.value }))}
//               required
//               fullWidth
//             />
//             <FormControl size="small" fullWidth>
//               <InputLabel>Category *</InputLabel>
//               <Select
//                 value={connectorForm.category}
//                 onChange={(e) => setConnectorForm(prev => ({ ...prev, category: e.target.value }))}
//                 displayEmpty
//                 label="Category *"
//               >
      
//                 {categoriesLoading ? (
//                   <MenuItem disabled>
//                     <em>Loading categories...</em>
//                   </MenuItem>
//                 ) : (
//                   categories.map((category) => (
//                     <MenuItem key={category.id} value={category.name}>
//                       {category.name}
//                     </MenuItem>
//                   ))
//                 )}
//               </Select>
//             </FormControl>
//             <TextField
//               size="small"
//               label="Use Case"
//               placeholder="Describe the use case for this connector..."
//               value={connectorForm.usecase}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, usecase: e.target.value }))}
//               multiline
//               rows={4}
//               fullWidth
//             />
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={resetConnectorForm} size="small">
//             Cancel
//           </Button>
//           <Button
//             onClick={handleAddConnector}
//             variant="contained"
//             size="small"
//           >
//             Add Connector
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Edit Connector Dialog */}
//       <Dialog
//         open={showEditConnectorForm}
//         onClose={closeEditModal}
//         maxWidth="sm"
//         fullWidth
//       >
//         <DialogTitle>
//           Edit Connector
//           <IconButton
//             aria-label="close"
//             onClick={closeEditModal}
//             sx={{
//               position: 'absolute',
//               right: 8,
//               top: 8,
//               color: (theme) => theme.palette.grey[500],
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent>
//           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
//             <TextField
//               size="small"
//               label="Connector Name *"
//               placeholder="My Custom Connector"
//               value={connectorForm.name}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, name: e.target.value }))}
//               required
//               fullWidth
//             />
//             <TextField
//               size="small"
//               label="Connector ID *"
//               placeholder="my-custom-connector"
//               value={connectorForm.connector_id}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, connector_id: e.target.value }))}
//               required
//               fullWidth
//               disabled
//             />
//             <FormControl size="small" fullWidth>
//               <InputLabel>Category *</InputLabel>
//               <Select
//                 value={connectorForm.category}
//                 onChange={(e) => setConnectorForm(prev => ({ ...prev, category: e.target.value }))}
//                 displayEmpty
//                 label="Category *"
//               >
//                 <MenuItem value="">
//                   <em>Select a category...</em>
//                 </MenuItem>
//                 {categoriesLoading ? (
//                   <MenuItem disabled>
//                     <em>Loading categories...</em>
//                   </MenuItem>
//                 ) : (
//                   categories.map((category) => (
//                     <MenuItem key={category.id} value={category.name}>
//                       {category.name}
//                     </MenuItem>
//                   ))
//                 )}
//               </Select>
//             </FormControl>
//             <TextField
//               size="small"
//               label="Use Case"
//               placeholder="Describe the use case for this connector..."
//               value={connectorForm.usecase}
//               onChange={(e) => setConnectorForm(prev => ({ ...prev, usecase: e.target.value }))}
//               multiline
//               rows={4}
//               fullWidth
//             />
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={closeEditModal} size="small">
//             Cancel
//           </Button>
//           <Button
//             onClick={handleUpdateConnector}
//             variant="contained"
//             size="small"
//           >
//             Update Connector
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </div>
//   );
// };

// export default AdminMarketplace;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../common/hooks/useAuth';
import { Trash2, ArrowDownUp, ChevronDown } from 'lucide-react';
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
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ElectricalServices as ElectricalServicesIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  Link as LinkIcon,
  Launch as LaunchIcon,
  CalendarToday as CalendarTodayIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { connectorsSuperadminApi } from '../../modules/Integrationlibrary/services/connectors/superadmin.api';
import { connectorsUserApi } from '../../modules/Integrationlibrary/services/connectors/user.api';

const AdminMarketplace = () => {
  const PAGE_SIZE = 50;
  const { user } = useAuth();
  const token = localStorage.getItem('connectx_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  const DEFAULT_LOGO =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="%23e5e7eb"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="%236b7280">CX</text></svg>';
  const resolveAssetUrl = (url) => {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }
    if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
    return `${API_BASE_URL}/${value}`;
  };
  const normalizeConnectorRow = (row = {}) => {
    const connectorId = String(row.connector_id || row.id || '').trim();
    return {
      ...row,
      connector_id: connectorId,
      id: row.id || connectorId,
      version_name: row.version_name || 'v1.0.0',
      logo_url: row.logo_url || DEFAULT_LOGO,
      guide_url: row.guide_url || (connectorId ? `/integration/connectors/${connectorId}/guide` : ''),
      json_url: row.json_url || (connectorId ? `/integration/connectors/${connectorId}/json` : ''),
    };
  };
  
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
    version_name: '',
    logo_url: '',
    guide_url: '',
    json_url: '',
  });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedUsecases, setExpandedUsecases] = useState({});
  const [assetUploading, setAssetUploading] = useState({
    logo: false,
    guide: false,
    json: false,
  });
  const headerActionButtonSx = {
    minWidth: 130,
    height: 40,
    px: 1.75,
    whiteSpace: 'nowrap',
    textTransform: 'none',
    fontWeight: 700,
    borderColor: '#bfd3ec',
    color: '#2f4d78',
    background: 'linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%)',
    boxShadow: '0 4px 10px rgba(30, 58, 102, 0.08)',
    borderRadius: '10px',
    '&:hover': {
      borderColor: '#8fb0d9',
      background: 'linear-gradient(180deg, #f4f8ff 0%, #eaf2ff 100%)',
    },
  };
  const [excelUploading, setExcelUploading] = useState(false);

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
  const totalPages = Math.max(1, Math.ceil(filteredMarketplaceCatalog.length / PAGE_SIZE));
  const visibleMarketplaceCatalog = filteredMarketplaceCatalog.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [connectorSearch, connectorTypeFilter, connectorSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Fetch connector catalog from real endpoint
  useEffect(() => {
    const fetchConnectorCatalog = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        setError('');

        let catalogData;
        try {
          catalogData = await connectorsSuperadminApi.getCatalog(token);
        } catch (apiError) {
          // Keep backward compatibility while superadmin catalog API rollout completes.
          console.warn('Superadmin catalog endpoint failed, falling back to legacy catalog endpoint.', apiError);
          const legacyRes = await fetch(`${API_BASE_URL}/connectors/catalog`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!legacyRes.ok) {
            throw apiError;
          }
          catalogData = await legacyRes.json();
        }

        setConnectorCatalog((catalogData || []).map((row) => normalizeConnectorRow(row)));
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

      const categoriesRes = await fetch(`${API_BASE_URL}/connectors/categories`, {
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
      await connectorsSuperadminApi.deleteCatalogEntry(connector.connector_id, token);

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
    const normalizedConnector = normalizeConnectorRow(connector);
    setEditingConnector(normalizedConnector);
    
    // Set form data
    const formData = {
      name: normalizedConnector.name || '',
      connector_id: normalizedConnector.connector_id || '',
      category: normalizedConnector.type || '', // Map type to category for editing
      usecase: normalizedConnector.usecase || '',
      version_name: normalizedConnector.version_name || '',
      logo_url: normalizedConnector.logo_url || '',
      guide_url: normalizedConnector.guide_url || '',
      json_url: normalizedConnector.json_url || '',
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

  const handleAssetUpload = async (kind, file) => {
    if (!file || !token) return;
    setAssetUploading((prev) => ({ ...prev, [kind]: true }));
    try {
      const uploaded = await connectorsSuperadminApi.uploadCatalogAsset(token, file, kind);
      const fieldMap = { logo: 'logo_url', guide: 'guide_url', json: 'json_url' };
      const targetField = fieldMap[kind];
      const uploadedUrl = uploaded?.url || (uploaded?.filename ? `/integration/superadmin/catalog/assets/${uploaded.filename}` : '');
      if (targetField) {
        setConnectorForm((prev) => ({ ...prev, [targetField]: uploadedUrl }));
      }
    } catch (err) {
      console.error(`Failed to upload ${kind}:`, err);
    } finally {
      setAssetUploading((prev) => ({ ...prev, [kind]: false }));
    }
  };

  const handleExcelImport = async (file) => {
    if (!file || !token) return;
    setExcelUploading(true);
    try {
      await connectorsSuperadminApi.uploadCatalogExcel(token, file);
      const catalogData = await connectorsSuperadminApi.getCatalog(token);
      setConnectorCatalog((catalogData || []).map((row) => normalizeConnectorRow(row)));
    } catch (err) {
      console.error('Failed to import connector Excel:', err);
    } finally {
      setExcelUploading(false);
    }
  };

  const parseUsecaseSections = (usecaseText) => {
    const ingestion = [];
    const action = [];
    const raw = String(usecaseText || '').trim();
    if (!raw) return { ingestion, action };

    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.startsWith('ingestion:')) {
        ingestion.push(line.split(':', 2)[1]?.trim() || '');
      } else if (lower.startsWith('action:')) {
        action.push(line.split(':', 2)[1]?.trim() || '');
      } else {
        ingestion.push(line);
      }
    });

    return {
      ingestion: ingestion.filter(Boolean),
      action: action.filter(Boolean),
    };
  };

  const toggleUsecases = (connectorKey) => {
    setExpandedUsecases((prev) => ({ ...prev, [connectorKey]: !prev[connectorKey] }));
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
        version_name: connectorForm.version_name || null,
        logo_url: connectorForm.logo_url || null,
        guide_url: connectorForm.guide_url || null,
        json_url: connectorForm.json_url || null,
      };

      const updated = await connectorsSuperadminApi.updateCatalogEntry(
        editingConnector.connector_id,
        token,
        payload,
      );
      const normalizedUpdated = normalizeConnectorRow({ ...editingConnector, ...payload, ...updated });
      setConnectorCatalog(prev => 
        prev.map(connector => 
          connector.connector_id === normalizedUpdated.connector_id ? normalizedUpdated : connector
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
      connector.connector_id || connector.id,
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
      version_name: '',
      logo_url: '',
      guide_url: '',
      json_url: '',
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
        version_name: connectorForm.version_name || null,
        logo_url: connectorForm.logo_url || null,
        guide_url: connectorForm.guide_url || null,
        json_url: connectorForm.json_url || null,
      };

      const created = await connectorsSuperadminApi.createCatalogEntry(token, payload);
      const normalizedCreated = normalizeConnectorRow({ ...payload, ...created });
      setConnectorCatalog(prev => [...prev, normalizedCreated]);
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
    <div className="p-6 admin-marketplace-shell">
      <div className="mb-8 admin-marketplace-hero">
        <div className="flex justify-between items-start mb-4 admin-marketplace-hero-head">
          <div className="admin-marketplace-title-wrap">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connector Marketplace</h1>
            <p className="text-gray-600">Browse and manage available connectors for your integration needs</p>
          </div>
          <Box className="admin-marketplace-actions" sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ElectricalServicesIcon />}
              onClick={() => setShowAddConnectorForm(true)}
              sx={headerActionButtonSx}
            >
              + Add Connector
            </Button>
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={excelUploading}
              startIcon={excelUploading ? <CircularProgress size={14} /> : <span>📥</span>}
              sx={headerActionButtonSx}
            >
              {excelUploading ? 'Importing...' : 'Upload Excel'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xlsm,.xltx,.xltm"
                onChange={(e) => {
                  handleExcelImport(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={exportConnectorSnapshot}
              sx={headerActionButtonSx}
            >
              📊 Export
            </Button>
          </Box>
        </div>
      </div>

      {/* Connector Toolbar - Exact same as Companies page */}
      <div className="connector-toolbar pl-2 mb-6 admin-marketplace-toolbar">
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
        <section className="connector-card-panel admin-marketplace-panel">
          <div className="connector-panel-head">
            <div className="connector-panel-actions">
              {/* Actions can be added here if needed */}
            </div>
          </div>
          <div className="connector-card-grid admin-marketplace-grid">
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
              visibleMarketplaceCatalog.map((connector) => {
                const connectorKey = connector.connector_id || connector.id;
                const expanded = !!expandedUsecases[connectorKey];
                const parsedUsecases = parseUsecaseSections(connector.usecase);
                return (
                  <div
                    key={connectorKey}
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
                    <button
                      type="button"
                      onClick={() => handleDeleteConnector(connector)}
                      className="connector-action-btn delete-btn"
                      title="Delete connector"
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <Avatar
                      src={resolveAssetUrl(connector.logo_url) || undefined}
                      alt={connector.name}
                      sx={{ width: 28, height: 28, fontSize: '0.8rem' }}
                    >
                      {(connector.name || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <div className="connector-grid-name">{connector.name}</div>
                      <div className="connector-grid-type">
                        {connector.type || 'Unknown'} · {connector.version_name || 'v1.0.0'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleUsecases(connectorKey)}
                    className="flex items-center gap-1 text-xs text-violet-700 font-medium mb-2"
                  >
                    <ArrowDownUp size={12} />
                    Use Cases
                    <ChevronDown
                      size={12}
                      style={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>
                  {expanded ? (
                    <Box sx={{ mb: 1.5, fontSize: '0.72rem', color: '#334155' }}>
                      {parsedUsecases.ingestion.length ? (
                        <>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                            INGESTION
                          </Typography>
                          {parsedUsecases.ingestion.slice(0, 3).map((item) => (
                            <Typography key={`${connectorKey}-ing-${item}`} variant="caption" display="block">
                              - {item}
                            </Typography>
                          ))}
                        </>
                      ) : null}
                      {parsedUsecases.action.length ? (
                        <>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: '#475569', mt: 0.5 }}
                            display="block"
                          >
                            ACTIONS
                          </Typography>
                          {parsedUsecases.action.slice(0, 3).map((item) => (
                            <Typography key={`${connectorKey}-act-${item}`} variant="caption" display="block">
                              - {item}
                            </Typography>
                          ))}
                        </>
                      ) : null}
                      {!parsedUsecases.ingestion.length && !parsedUsecases.action.length ? (
                        <Typography variant="caption">No use cases available</Typography>
                      ) : null}
                    </Box>
                  ) : null}
                  <div className="flex gap-2 flex-wrap mt-2 mb-2">
                    <Chip size="small" label={connector.type || 'Unknown'} />
                    <Chip size="small" label="Enterprise" />
                  </div>
                </div>
                );
              })
            )}
          </div>
          {filteredMarketplaceCatalog.length > PAGE_SIZE ? (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filteredMarketplaceCatalog.length)} of {filteredMarketplaceCatalog.length} connectors
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                size="small"
              />
            </Box>
          ) : null}
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
                    <img src={resolveAssetUrl(selectedConnector.logo_url)} alt={selectedConnector.name} style={{ width: 32, height: 32 }} />
                  ) : (
                    <img src={DEFAULT_LOGO} alt="default logo" style={{ width: 32, height: 32 }} />
                  )}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                    {selectedConnector.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={selectedConnector.connector_id || selectedConnector.id}
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
                    {selectedConnector.connector_id || selectedConnector.id}
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

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InfoIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Version
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedConnector.version_name || 'v1.0.0'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinkIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Guide URL
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2, wordBreak: 'break-all' }}>
                    {selectedConnector.guide_url || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LinkIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      JSON URL
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2, wordBreak: 'break-all' }}>
                    {selectedConnector.json_url || '-'}
                  </Typography>
                </Grid>

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
        PaperProps={{ sx: { borderRadius: 2, border: '1px solid #c9d7ea' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 1.5 }}>
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
        <DialogContent dividers sx={{ maxHeight: '68vh' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
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
            <TextField
              size="small"
              label="Version"
              placeholder="v1.0.0"
              value={connectorForm.version_name}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, version_name: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={connectorForm.logo_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, logo_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.logo}
              startIcon={assetUploading.logo ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.logo ? 'Uploading Logo...' : 'Upload Logo File'}
              <input
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                onChange={(e) => {
                  handleAssetUpload('logo', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
            <TextField
              size="small"
              label="Guide URL"
              placeholder="/integration/connectors/my-connector/guide"
              value={connectorForm.guide_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, guide_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.guide}
              startIcon={assetUploading.guide ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.guide ? 'Uploading Guide...' : 'Upload Guide File (.md/.txt)'}
              <input
                type="file"
                hidden
                accept=".md,.txt,text/markdown,text/plain"
                onChange={(e) => {
                  handleAssetUpload('guide', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
            <TextField
              size="small"
              label="JSON URL"
              placeholder="/integration/connectors/my-connector/json"
              value={connectorForm.json_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, json_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.json}
              startIcon={assetUploading.json ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.json ? 'Uploading JSON...' : 'Upload JSON File'}
              <input
                type="file"
                hidden
                accept=".json,application/json"
                onChange={(e) => {
                  handleAssetUpload('json', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 2, py: 1.5 }}>
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
        PaperProps={{ sx: { borderRadius: 2, border: '1px solid #c9d7ea' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 1.5 }}>
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
        <DialogContent dividers sx={{ maxHeight: '68vh' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
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
            <TextField
              size="small"
              label="Version"
              placeholder="v1.0.0"
              value={connectorForm.version_name}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, version_name: e.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={connectorForm.logo_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, logo_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.logo}
              startIcon={assetUploading.logo ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.logo ? 'Uploading Logo...' : 'Upload Logo File'}
              <input
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                onChange={(e) => {
                  handleAssetUpload('logo', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
            <TextField
              size="small"
              label="Guide URL"
              placeholder="/integration/connectors/my-connector/guide"
              value={connectorForm.guide_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, guide_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.guide}
              startIcon={assetUploading.guide ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.guide ? 'Uploading Guide...' : 'Upload Guide File (.md/.txt)'}
              <input
                type="file"
                hidden
                accept=".md,.txt,text/markdown,text/plain"
                onChange={(e) => {
                  handleAssetUpload('guide', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
            <TextField
              size="small"
              label="JSON URL"
              placeholder="/integration/connectors/my-connector/json"
              value={connectorForm.json_url}
              onChange={(e) => setConnectorForm(prev => ({ ...prev, json_url: e.target.value }))}
              fullWidth
            />
            <Button
              component="label"
              variant="outlined"
              size="small"
              disabled={assetUploading.json}
              startIcon={assetUploading.json ? <CircularProgress size={14} /> : null}
              sx={{ borderColor: '#b7c8df', color: '#375a82', fontWeight: 700 }}
            >
              {assetUploading.json ? 'Uploading JSON...' : 'Upload JSON File'}
              <input
                type="file"
                hidden
                accept=".json,application/json"
                onChange={(e) => {
                  handleAssetUpload('json', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 2, py: 1.5 }}>
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
