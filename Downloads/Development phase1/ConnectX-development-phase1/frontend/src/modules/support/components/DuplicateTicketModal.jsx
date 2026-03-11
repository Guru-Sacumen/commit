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
} from '@mui/material';
import { 
  AlertTriangle, 
  ExternalLink, 
  Plus,
  X,
  Clock,
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

/**
 * DuplicateTicketModal - Modal shown when a duplicate ticket is detected.
 * 
 * Per Session 8 requirements:
 * - Show existing ticket details (title, status, created date)
 * - "View Existing Ticket" button
 * - "Force Create New" button (manual tickets only)
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.existingTicket - Existing duplicate ticket data
 * @param {Function} props.onViewExisting - View existing ticket handler
 * @param {Function} props.onForceCreate - Force create new ticket handler
 * @param {boolean} props.isManualTicket - Whether this is a manual ticket (can force create)
 * @param {boolean} props.isCreating - Whether creation is in progress
 * @returns {JSX.Element} Duplicate ticket modal
 */
const DuplicateTicketModal = ({ 
  open, 
  onClose, 
  existingTicket,
  onViewExisting, 
  onForceCreate,
  isManualTicket = true,
  isCreating = false,
}) => {
  if (!existingTicket) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateTicketId = (ticketId) => {
    if (!ticketId) return '';
    const numericPart = ticketId.replace(/[^0-9]/g, '').substring(0, 4) || 
      Math.abs(ticketId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 10000);
    return `CX-${String(numericPart).padStart(4, '0')}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
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
          <AlertTriangle size={20} color="#F59E0B" />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#92400E' }}>
            Duplicate Ticket Detected
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
        <Box sx={{ 
          mb: 3, 
          p: 2, 
          backgroundColor: '#FFFBEB', 
          borderRadius: '8px',
          border: '1px solid #FDE68A',
        }}>
          <Typography variant="body2" sx={{ color: '#92400E' }}>
            A similar ticket already exists in the system. You can view the existing ticket or create a new one anyway.
          </Typography>
        </Box>

        {/* Existing Ticket Details */}
        <Box sx={{ 
          p: 3, 
          backgroundColor: '#F9FAFB', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#6B7280', 
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {generateTicketId(existingTicket.id)}
            </Typography>
            <StatusBadge status={existingTicket.status} size="small" />
          </Box>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
            {existingTicket.title}
          </Typography>

          {existingTicket.description && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#6B7280', 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {existingTicket.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <PriorityBadge priority={existingTicket.priority} size="small" />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Clock size={14} color="#9CA3AF" />
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Created {formatDate(existingTicket.created_at)}
              </Typography>
            </Box>
          </Box>

          {existingTicket.similarity_score && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E5E7EB' }}>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>
                Similarity: {Math.round(existingTicket.similarity_score * 100)}% match
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        py: 2, 
        borderTop: '1px solid #E5E7EB',
        gap: 1,
        justifyContent: 'space-between',
      }}>
        <Button
          variant="text"
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: '#6B7280',
          }}
        >
          Cancel
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isManualTicket && (
            <Button
              variant="outlined"
              startIcon={<Plus size={16} />}
              onClick={onForceCreate}
              disabled={isCreating}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                borderColor: '#E5E7EB',
                color: '#374151',
                '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
              }}
            >
              {isCreating ? 'Creating...' : 'Create Anyway'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<ExternalLink size={16} />}
            onClick={onViewExisting}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              backgroundColor: '#6366F1',
              '&:hover': { backgroundColor: '#4F46E5' },
            }}
          >
            View Existing Ticket
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateTicketModal;
