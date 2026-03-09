import React from 'react';
import { Alert, AlertTitle, Box, Collapse, IconButton } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const ModernAlert = ({ 
  open, 
  message, 
  severity = 'info', 
  title,
  onClose,
  variant = 'filled',
  sx = {}
}) => {
  const getIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon fontSize="inherit" />;
      case 'error':
        return <ErrorIcon fontSize="inherit" />;
      case 'warning':
        return <WarningIcon fontSize="inherit" />;
      case 'info':
      default:
        return <InfoIcon fontSize="inherit" />;
    }
  };

  const getDefaultTitle = (severity) => {
    switch (severity) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Information';
    }
  };

  if (!open || !message) return null;

  return (
    <Collapse in={open}>
      <Alert
        severity={severity}
        variant={variant}
        icon={getIcon(severity)}
        sx={{
          mb: 2,
          borderRadius: 2,
          '& .MuiAlert-message': {
            width: '100%'
          },
          ...sx
        }}
        action={
          onClose && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )
        }
      >
        {title || getDefaultTitle(severity) && (
          <AlertTitle sx={{ mb: 0.5 }}>
            {title || getDefaultTitle(severity)}
          </AlertTitle>
        )}
        {message}
      </Alert>
    </Collapse>
  );
};

export default ModernAlert;
