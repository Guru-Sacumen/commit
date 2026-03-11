import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  Card,
  CardContent,
  TextField,
  Button,
  Tooltip,
  Chip,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Key as KeyIcon,
  Logout as LogoutIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../../common/hooks/useAuth';
import userService from '../../common/services/userService';
import ResetPasswordInline from '../ResetPasswordInline/ResetPasswordInline';

const UserProfilePopup = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState('about');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Fetch user data from /me endpoint
  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getCurrentUser();
      setUserData(data);
      setEditedName(data.full_name || data.name || '');
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
      // Fallback to localStorage data if API fails
      setUserData(user);
      setEditedName(user?.full_name || user?.name || '');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await userService.updateCurrentUser({ full_name: editedName });
      
      // Update local state
      setUserData(prev => ({ ...prev, full_name: editedName }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(userData?.full_name || userData?.name || '');
    setIsEditing(false);
  };

  const handleCopyEmail = async () => {
    const email = userData?.email || user?.email;
    if (email) {
      try {
        await navigator.clipboard.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy email:', err);
      }
    }
  };

  const handleResetPassword = () => {
    setSelectedTab('reset-password');
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  // Get user data with fallbacks
  const currentUserData = userData || user;
  const userName = currentUserData?.full_name || currentUserData?.name || 'User';
  const userEmail = currentUserData?.email || 'N/A';
  const userRole = currentUserData?.role || 'USER';
  const isSuperAdmin = currentUserData?.superadmin || false;
  const authProvider = currentUserData?.auth_provider || 'LOCAL';
  const mfaEnabled = currentUserData?.mfa_enabled || false;
  const totpVerified = currentUserData?.totp_verified || false;
  const createdAt = currentUserData?.created_at ? new Date(currentUserData.created_at).toLocaleDateString() : 'N/A';

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'error';
      case 'ADMIN':
        return 'primary';
      case 'MEMBER':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} fullWidth  PaperProps={{ sx: { height: '620px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight="bold">
            User Profile
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box>
            {/* User Profile Header - Above Tabs */}
            <Card elevation={0} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', mb: 3 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box flex={1}>
                    {isEditing ? (
                      <Stack spacing={1}>
                        <TextField
                          fullWidth
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          size="small"
                          sx={{ maxWidth: '300px' }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={loading}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6" fontWeight="bold">
                            {userName}
                          </Typography>
                          <IconButton size="small" onClick={handleEdit}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Member since {createdAt}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                          <Chip 
                            label={userRole} 
                            color={getRoleColor(userRole)}
                            size="small"
                            variant="outlined"
                          />
                          {isSuperAdmin && (
                            <Chip 
                              label="SUPERADMIN" 
                              color="error"
                              size="small"
                            />
                          )}
                        </Stack>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs 
              value={selectedTab} 
              onChange={(e, newValue) => setSelectedTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              <Tab label="About" value="about" />
              <Tab label="Reset Password" value="reset-password" />
            </Tabs>

            {/* About Tab Content */}
            {selectedTab === 'about' && (
              <Box>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                ) : (
                  <Stack spacing={3}>
                    {/* User Details */}
                    {/* Email */}
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <EmailIcon color="action" />
                      <Box flex={1}>
                        <Typography variant="body2" color="text.secondary">
                          Email Address
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {userEmail}
                          </Typography>
                          <Tooltip title={copied ? "Copied!" : "Copy email"}>
                            <IconButton size="small" onClick={handleCopyEmail}>
                              {copied ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                              ) : (
                                <CopyIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Stack>

                    {/* MFA Status */}
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <SecurityIcon color="action" />
                      <Box flex={1}>
                        <Typography variant="body2" color="text.secondary">
                          Two-Factor Authentication
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip 
                            label={mfaEnabled ? "Enabled" : "Disabled"} 
                            color={mfaEnabled ? "success" : "default"}
                            size="small"
                          />
                          {mfaEnabled && totpVerified && (
                            <Chip 
                              label="TOTP Verified" 
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Stack>
                )}
              </Box>
            )}

            {/* Reset Password Tab Content */}
            {selectedTab === 'reset-password' && (
              <Box>
                <ResetPasswordInline />
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfilePopup;
