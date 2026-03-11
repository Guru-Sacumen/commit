import React from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const CommonSnackbar = ({ 
  open, 
  onClose, 
  message, 
  severity = 'success', 
  autoHideDuration = 6000,
  position = { vertical: 'top', horizontal: 'right' }
}) => {
  const getIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      case 'info':
        return <InfoIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getAlertTitle = (severity) => {
    switch (severity) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Info';
      default:
        return 'Info';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={position}
      sx={{
        mt: 8, // Add some margin from top to avoid overlap with header
        '& .MuiSnackbar-root': {
          zIndex: 9999
        }
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        icon={getIcon(severity)}
        sx={{
          minWidth: 300,
          maxWidth: 500,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              fontSize: '16px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        }
      >
        <AlertTitle sx={{ mb: 0.5 }}>
          {getAlertTitle(severity)}
        </AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default CommonSnackbar;
