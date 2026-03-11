import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { 
  FileText, 
  Tag, 
  AlertTriangle, 
  Link as LinkIcon, 
  Paperclip,
  Edit,
  Send,
  X,
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';

/**
 * TicketPreviewModal - Preview ticket before creation.
 * 
 * Per Session 8 requirements:
 * - Display auto-generated title, module, priority, description, metadata
 * - Show attachments list
 * - Edit button returns to form
 * - Submit button creates ticket
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.previewData - Ticket preview data
 * @param {Function} props.onEdit - Edit button handler
 * @param {Function} props.onSubmit - Submit button handler
 * @param {boolean} props.isSubmitting - Whether submission is in progress
 * @returns {JSX.Element} Ticket preview modal
 */
const TicketPreviewModal = ({ 
  open, 
  onClose, 
  previewData, 
  onEdit, 
  onSubmit,
  isSubmitting = false,
}) => {
  if (!previewData) return null;

  const {
    title,
    description,
    priority,
    module_reference,
    attachments = [],
    validation_errors = [],
    is_valid = true,
  } = previewData;

  const getModuleName = (moduleRef) => {
    if (!moduleRef) return null;
    const moduleNames = {
      integration_library: 'Integration Library',
      lab: 'Lab',
      automated_testing: 'Automated Testing',
      agentic_monitor: 'Agentic Monitor',
    };
    return moduleNames[moduleRef.module] || moduleRef.module;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Critical: { bg: '#FEE2E2', text: '#DC2626' },
      High: { bg: '#FFEDD5', text: '#EA580C' },
      Medium: { bg: '#DBEAFE', text: '#2563EB' },
      Low: { bg: '#F3F4F6', text: '#6B7280' },
    };
    return colors[priority] || colors.Medium;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #E5E7EB',
        pb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={20} color="#6366F1" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Ticket Preview
          </Typography>
        </Box>
        <Button 
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          <X size={20} color="#6B7280" />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* Validation Errors */}
        {validation_errors.length > 0 && (
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: '#FEF2F2', 
            borderRadius: '8px',
            border: '1px solid #FECACA',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AlertTriangle size={16} color="#DC2626" />
              <Typography variant="subtitle2" sx={{ color: '#DC2626', fontWeight: 600 }}>
                Validation Errors
              </Typography>
            </Box>
            <List dense sx={{ py: 0 }}>
              {validation_errors.map((error, index) => (
                <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                  <Typography variant="body2" sx={{ color: '#991B1B' }}>
                    • {error.field}: {error.message}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Title */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
            Title
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mt: 0.5 }}>
            {title || 'Untitled Ticket'}
          </Typography>
        </Box>

        {/* Priority and Module */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
              Priority
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <PriorityBadge priority={priority} />
            </Box>
          </Box>

          {module_reference && (
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
                Source Module
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <LinkIcon size={14} color="#6366F1" />
                <Typography variant="body2" sx={{ color: '#374151' }}>
                  {getModuleName(module_reference)}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
            Description
          </Typography>
          <Box sx={{ 
            mt: 1, 
            p: 2, 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}>
            <Typography variant="body2" sx={{ color: '#374151', whiteSpace: 'pre-wrap' }}>
              {description || 'No description provided'}
            </Typography>
          </Box>
        </Box>

        {/* Module Reference Details */}
        {module_reference && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
              Module Reference
            </Typography>
            <Box sx={{ 
              mt: 1, 
              p: 2, 
              backgroundColor: '#F0F9FF', 
              borderRadius: '8px',
              border: '1px solid #BAE6FD',
            }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#0369A1' }}>Module</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {module_reference.module}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#0369A1' }}>Resource Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {module_reference.resource_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#0369A1' }}>Resource ID</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                    {module_reference.resource_id}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
              Attachments ({attachments.length})
            </Typography>
            <List sx={{ mt: 1 }}>
              {attachments.map((attachment, index) => (
                <ListItem 
                  key={index}
                  sx={{ 
                    py: 1, 
                    px: 2, 
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    mb: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Paperclip size={16} color="#6B7280" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={attachment.name || attachment}
                    secondary={attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : null}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        py: 2, 
        borderTop: '1px solid #E5E7EB',
        gap: 1,
      }}>
        <Button
          variant="outlined"
          startIcon={<Edit size={16} />}
          onClick={onEdit}
          disabled={isSubmitting}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            borderColor: '#E5E7EB',
            color: '#374151',
            '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
          }}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
          onClick={onSubmit}
          disabled={!is_valid || isSubmitting}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            backgroundColor: '#6366F1',
            '&:hover': { backgroundColor: '#4F46E5' },
            '&:disabled': { backgroundColor: '#E5E7EB' },
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketPreviewModal;
