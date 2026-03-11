import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Lock as LockIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import userService from '../../common/services/userService';

const ResetPasswordInline = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Form validation
  const isFormValid = () => {
    return currentPassword && 
           newPassword && 
           confirmPassword && 
           newPassword.length >= 6 && 
           newPassword === confirmPassword;
  };

  // Get email from user data
  const getUserEmail = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return parsedUser.email || parsedUser.email_address || '';
    }
    return '';
  };

  const handleClear = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setMessageType('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const email = getUserEmail();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirmation do not match');
      setMessageType('error');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await userService.changePassword({
        email,
        current_password: currentPassword,
        new_password: newPassword
      });

      setMessage('Password reset successfully!');
      setMessageType('success');
      
      // Clear form after success
      setTimeout(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage(error.response?.data?.detail || 'Failed to reset password');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordInputProps = (field) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={() => togglePasswordVisibility(field)}
          edge="end"
        >
          {showPasswords[field] ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </InputAdornment>
    )
  });

  return (
    <Box>

      <Box component="form" onSubmit={handleResetPassword}>
        <Stack spacing={2}>
          {/* Message Display */}
          {message && (
            <Alert 
              severity={messageType}
              icon={messageType === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
            >
              {message}
            </Alert>
          )}

          {/* Current Password Field */}
          <TextField
            fullWidth
            label="Current Password"
            type={showPasswords.current ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              ...getPasswordInputProps('current')
            }}
          />

          {/* New Password Field */}
          <TextField
            fullWidth
            label="New Password"
            type={showPasswords.new ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            size="small"
            inputProps={{ minLength: 6 }}
            helperText="Password must be at least 8 characters long"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon color="action" />
                </InputAdornment>
              ),
              ...getPasswordInputProps('new')
            }}
          />

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            size="small"
            inputProps={{ minLength: 6 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon color="action" />
                </InputAdornment>
              ),
              ...getPasswordInputProps('confirm')
            }}
          />

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} display={'flex'} justifyContent={'space-between'}>
            <Button
              type="button"
              variant="outlined"
              onClick={handleClear}
              disabled={loading}
              size="small"
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !isFormValid()}
              startIcon={loading ? <CircularProgress size={16} /> : <KeyIcon />}
              size="small"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default ResetPasswordInline;
