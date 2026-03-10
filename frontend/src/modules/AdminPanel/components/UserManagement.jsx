import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Grid,
  Avatar,
  Card,
  CardContent,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import CommonSnackbar from '../../../common/components/CommonSnackbar';
import './enhanced-admin.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Helper function to extract error messages from API responses
const extractErrorMessage = (errorText, defaultMessage = 'An error occurred') => {
  try {
    const parsed = JSON.parse(errorText);
    return parsed.detail || parsed.message || defaultMessage;
  } catch {
    return errorText || defaultMessage;
  }
};

function UserManagement({ 
  users, 
  currentTenant, 
  token, 
  onUpdate,
  onRefreshUsers,
  adminUser,
  isSuper 
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'MEMBER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null, userName: '' });
  const [reset2FAConfirm, setReset2FAConfirm] = useState({ open: false, userId: null, userName: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const hasInitializedRoleChanges = useRef(false);

  // Restore role changes from localStorage on component mount or when users change significantly
  useEffect(() => {
    if (users.length > 0 && !hasInitializedRoleChanges.current) {
      const roleChanges = JSON.parse(localStorage.getItem('roleChanges') || '{}');
      const hasChanges = Object.keys(roleChanges).some(userId => 
        roleChanges[userId] && users.find(u => u.id === userId)?.role !== roleChanges[userId]
      );
      
      if (hasChanges) {
        // Apply stored role changes to current users
        const updatedUsers = users.map(user => ({
          ...user,
          role: roleChanges[user.id] || user.role
        }));
        onUpdate(updatedUsers);
      }
      hasInitializedRoleChanges.current = true;
    }
  }, [users, onUpdate]);

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    
    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(lowerSearch) ||
      (user.full_name && user.full_name.toLowerCase().includes(lowerSearch)) ||
      user.role.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchTerm]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const openDeleteConfirm = (userId, userName) => {
    setDeleteConfirm({ open: true, userId, userName });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, userId: null, userName: '' });
  };

  const openReset2FAConfirm = (userId, userName) => {
    setReset2FAConfirm({ open: true, userId, userName });
  };

  const closeReset2FAConfirm = () => {
    setReset2FAConfirm({ open: false, userId: null, userName: '' });
  };

  const handleAddUser = () => {
    setShowCreateForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      fullName: user.full_name || '',
      password: '',
      role: user.role || 'MEMBER',
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setForm({ email: '', fullName: '', password: '', role: 'MEMBER' });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.fullName || (!form.password && !editingUser)) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);

    try {
      if (editingUser) {
        // Update existing user
        const updateData = { 
          full_name: form.fullName,
          role: form.role 
        };
        if (form.password) {
          updateData.password = form.password;
        }

        const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(extractErrorMessage(errorText, 'Failed to update user'));
        }

        const updated = await res.json();
        showSnackbar('User updated successfully');
        
        // Refresh user data from backend to ensure consistency
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      } else {
        // Create new user
        const params = new URLSearchParams();
        params.append('email', form.email);
        params.append('full_name', form.fullName);
        params.append('password', form.password);
        params.append('role', form.role);

        const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users?${params.toString()}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const detail = extractErrorMessage(await res.text(), 'Failed to create user');
          if (typeof detail === 'string' && detail.toLowerCase().includes('tenant already has an admin')) {
            showSnackbar(detail, 'error');
            return;
          }
          throw new Error(detail);
        }

        const created = await res.json();
        showSnackbar('User created successfully');
        
        // Refresh user data from backend to ensure consistency
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      }

      resetForm();
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Unable to save user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    openDeleteConfirm(userId, user.email);
  };

  const confirmDelete = async () => {
    const { userId } = deleteConfirm;
    closeDeleteConfirm();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to delete user'));
      }

      showSnackbar('User deleted successfully');
      
      // Refresh user data from backend to ensure consistency
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Unable to delete user', 'error');
    }
  };

  const confirmReset2FA = async () => {
    const { userId } = reset2FAConfirm;
    closeReset2FAConfirm();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${userId}/reset-2fa`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(extractErrorMessage(await res.text(), 'Failed to reset 2FA'));
      }

      const result = await res.json();
      showSnackbar(result.message || '2FA reset successfully');
      
      // Refresh user data from backend to ensure consistency
      if (onRefreshUsers) {
        onRefreshUsers();
      }
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Unable to reset 2FA', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      // Now that backend supports multiple admins, we can properly update roles
      const res = await fetch(`${API_BASE_URL}/admin/${currentTenant}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(extractErrorMessage(errorText, 'Failed to update user role'));
      }

      const updated = await res.json();
      showSnackbar(`User role updated to ${newRole.toLowerCase()}`);
      
      // Refresh user data from backend to ensure consistency
      if (onRefreshUsers) {
        onRefreshUsers();
      }
      
    } catch (err) {
      console.error(err);
      showSnackbar(err.message || 'Failed to update user role', 'error');
    }
  };

  const members = filteredUsers.filter(u => u.role === 'MEMBER');
  const admins = filteredUsers.filter(u => u.role === 'ADMIN');

  return (
    <>
      <Box sx={{ p: 2 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip 
            label={`Total: ${filteredUsers.length}`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<PersonIcon />}
            onClick={() => setShowCreateForm(true)}
          >
            + Add User
          </Button>
        </Box>
      </Box>

      {/* Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search by email, name, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
      </Box>

      {/* User Statistics */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip 
          label={`Admins: ${admins.length}`} 
          size="small" 
          color="primary" 
          variant="filled"
        />
        <Chip 
          label={`Users: ${members.length}`} 
          size="small" 
          color="secondary" 
          variant="filled"
        />
        {searchTerm && (
          <Chip 
            label={`Filtered: ${filteredUsers.length} of ${users.length}`} 
            size="small" 
            color="info" 
            variant="outlined"
          />
        )}
      </Box>

      {/* Users Grid */}


      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Avatar sx={{ 
            bgcolor: 'grey.300', 
            width: 64, 
            height: 64, 
            margin: '0 auto 16px',
            fontSize: '2rem' 
          }}>
            <PersonIcon sx={{ fontSize: '2rem' }} />
          </Avatar>
          <Typography variant="h6" component="div" gutterBottom>
            {searchTerm ? 'No Users Found' : 'No Users Yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 3 }}>
            {searchTerm 
              ? 'No users match your search criteria.'
              : 'Create your first user to get started.'
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<PersonIcon />}
              onClick={handleAddUser}
            >
              Create First User
            </Button>
          )}
        </Box>
      )}
    </Box>
    
    {/* Create/Edit User Dialog */}
    <Dialog 
      open={showCreateForm} 
      onClose={resetForm}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {editingUser ? 'Edit User' : 'Create New User'}
        <IconButton
          aria-label="close"
          onClick={resetForm}
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
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
              size="small"
              disabled={!!editingUser}
            />
            
            <TextField
              label="Full Name"
              placeholder="Enter full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              fullWidth
              size="small"
            />
            
            <TextField
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              type={showPassword ? 'text' : 'password'}
              placeholder={editingUser ? "Enter new password" : "Enter password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              size="small"
              required={!editingUser}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Role Selection - Enable for admin and superadmin users */}
            {(isSuper || adminUser?.role === 'ADMIN') && (
              <FormControl fullWidth size="small">
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  disabled={editingUser && editingUser.id === adminUser?.id}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="MEMBER" sx={{ fontSize: '0.875rem' }}>User</MenuItem>
                  <MenuItem value="ADMIN" sx={{ fontSize: '0.875rem' }}>Admin</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  {editingUser ? 'Admins can update user roles as needed.' : 'Choose the role for the new user.'}
                </Typography>
              </FormControl>
            )}

            {/* Show current role for non-admin users */}
            {(!isSuper && adminUser?.role !== 'ADMIN') && (
              <FormControl fullWidth size="small" disabled>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={form.role}
                  disabled
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="MEMBER" sx={{ fontSize: '0.875rem' }}>User</MenuItem>
                  <MenuItem value="ADMIN" sx={{ fontSize: '0.875rem' }}>Admin</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  You do not have permission to manage user roles.
                </Typography>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={resetForm}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Users Grid */}
      <Grid container spacing={3}>
        {filteredUsers.map((user) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={user.id}>
            <Card variant="outlined" sx={{ height: '100%', minHeight: 200 }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar 
                    size="medium" 
                    sx={{ 
                      bgcolor: user.role === 'ADMIN' ? 'primary.main' : 'secondary.main',
                      width: 48,
                      height: 48,
                      fontSize: '1.25rem'
                    }}
                  >
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="h6" 
                      component="div"
                      sx={{ 
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '1rem'
                      }}
                    >
                      {user.full_name || 'No Name'}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      component="div"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {(isSuper || adminUser?.role === 'ADMIN') && user.id !== adminUser?.id ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        size="small"
                        sx={{ fontSize: '0.875rem', height: 36 }}
                      >
                        <MenuItem value="MEMBER" sx={{ fontSize: '0.875rem' }}>User</MenuItem>
                        <MenuItem value="ADMIN" sx={{ fontSize: '0.875rem' }}>Admin</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip 
                      label={user.role} 
                      size="medium" 
                      color={user.role === 'ADMIN' ? 'primary' : 'secondary'}
                      variant="outlined"
                      sx={{ fontSize: '0.875rem', height: 32 }}
                    />
                  )}
                  <ButtonGroup size="small">
                    <IconButton 
                      size="small" 
                      onClick={() => handleEdit(user)}
                      sx={{ p: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {user.id !== adminUser?.id && (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDelete(user.id)}
                        sx={{ p: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </ButtonGroup>
                </Box>

                {/* Future Features Section - Placeholder */}
                <Box sx={{ 
                  borderTop: 1, 
                  borderColor: 'divider', 
                  pt: 2, 
                  display: 'flex', 
                  gap: 1, 
                  flexDirection: 'column' 
                }}>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ fontSize: '0.75rem' }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {/* Placeholder for future Reinvite Email button */}
                    <Button 
                      size="small" 
                      variant="outlined" 
                      disabled
                      sx={{ fontSize: '0.75rem', py: 0.5 }}
                    >
                      📧 Reinvite
                    </Button>
                    {/* Placeholder for future Reset Google Authenticator button */}
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => openReset2FAConfirm(user.id, user.email)}
                      sx={{ fontSize: '0.75rem', py: 0.5 }}
                    >
                      🔐 Reset 2FA
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Avatar sx={{ 
            bgcolor: 'grey.300', 
            width: 64, 
            height: 64, 
            margin: '0 auto 16px',
            fontSize: '2rem' 
          }}>
            <PersonIcon sx={{ fontSize: '2rem' }} />
          </Avatar>
          <Typography variant="h6" component="div" gutterBottom>
            {searchTerm ? 'No Users Found' : 'No Users Yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 3 }}>
            {searchTerm 
              ? 'No users match your search criteria.'
              : 'Create your first user to get started.'
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<PersonIcon />}
              onClick={() => setShowCreateForm(true)}
            >
              Create First User
            </Button>
          )}
        </Box>
      )}
    
    {/* Common Snackbar for notifications */}
    <CommonSnackbar
      open={snackbar.open}
      onClose={closeSnackbar}
      message={snackbar.message}
      severity={snackbar.severity}
    />
    
    {/* Delete Confirmation Dialog */}
    <Dialog
      open={deleteConfirm.open}
      onClose={closeDeleteConfirm}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Confirm Delete User
        <IconButton
          aria-label="close"
          onClick={closeDeleteConfirm}
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
        <Typography>
          Are you sure you want to delete the user <strong>{deleteConfirm.userName}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDeleteConfirm} color="primary">
          Cancel
        </Button>
        <Button onClick={confirmDelete} color="error" variant="contained">
          Delete User
        </Button>
      </DialogActions>
    </Dialog>
    
    {/* Reset 2FA Confirmation Dialog */}
    <Dialog
      open={reset2FAConfirm.open}
      onClose={closeReset2FAConfirm}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Confirm Reset 2FA
        <IconButton
          aria-label="close"
          onClick={closeReset2FAConfirm}
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
        <Typography sx={{ mb: 2 }}>
          Are you sure you want to reset Google Authenticator for <strong>{reset2FAConfirm.userName}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ⚠️ This action will reset the Google Authenticator setup for this user. 
          The user will need to set up Google Authenticator again on their next login.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please ensure the user is informed before proceeding with this action.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeReset2FAConfirm} color="primary">
          Cancel
        </Button>
        <Button onClick={confirmReset2FA} color="warning" variant="contained">
          Reset 2FA
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default UserManagement;
