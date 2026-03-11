import React from 'react';
import { Card, CardContent, Avatar, Typography, Box, Tooltip, Chip } from '@mui/material';
import { User } from 'lucide-react';

/**
 * TicketCard - Support Portal ticket card for Kanban board display.
 * 
 * Per screenshot design:
 * - Ticket ID (TKT-XXXX) with priority badge on right
 * - Title/subject
 * - Category label
 * - Timestamp and assignee at bottom
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ticket - Ticket data
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isDragging - Whether card is being dragged
 * @returns {JSX.Element} Ticket card component
 */
const TicketCard = ({ ticket, onClick, isDragging = false }) => {
  const {
    id,
    ticket_number,
    title,
    description,
    priority,
    status,
    assigned_to_name,
    assigned_to_avatar,
    module_reference,
    category,
    created_at,
    updated_at,
  } = ticket;

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Use ticket_number from backend (CX-XXXX format)
  const ticketIdShort = ticket_number || id;

  // Get priority badge style
  const getPriorityStyle = (pri) => {
    const styles = {
      Critical: { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
      High: { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
      Medium: { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' },
      Low: { bg: '#E5E7EB', color: '#6B7280', border: '#D1D5DB' },
    };
    return styles[pri] || styles.Medium;
  };

  const priorityStyle = getPriorityStyle(priority);

  // Get category/module label
  const getCategoryLabel = () => {
    if (module_reference?.module) {
      const moduleLabels = {
        agentic_monitor: 'AI Monitoring Alert',
        connector_library: 'Pre-Built Connector Issue',
        lab: 'Lab Environment',
        automated_testing: 'Automated Testing',
      };
      return moduleLabels[module_reference.module] || module_reference.module;
    }
    return category || 'General';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get avatar background color
  const getAvatarColor = (name) => {
    if (!name) return '#E5E7EB';
    const colors = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        mb: 1.5,
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        boxShadow: isDragging 
          ? '0 8px 16px rgba(0, 0, 0, 0.15)' 
          : '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderColor: '#D1D5DB',
        },
        backgroundColor: '#FFFFFF',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: Ticket ID and Priority Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#7C3AED',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {ticketIdShort}
          </Typography>
          <Chip
            label={priority}
            size="small"
            sx={{
              height: '20px',
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: priorityStyle.bg,
              color: priorityStyle.color,
              border: `1px solid ${priorityStyle.border}`,
              borderRadius: '4px',
              '& .MuiChip-label': {
                px: 0.75,
              },
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: '#111827',
            mb: 0.75,
            lineHeight: 1.4,
            fontSize: '0.875rem',
          }}
        >
          {truncateText(title, 100)}
        </Typography>

        {/* Category Label */}
        <Typography
          variant="caption"
          sx={{
            color: '#6B7280',
            fontSize: '0.75rem',
            display: 'block',
            mb: 1.5,
          }}
        >
          {getCategoryLabel()}
        </Typography>

        {/* Footer: Date and Assignee */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: '#9CA3AF',
              fontSize: '0.75rem',
            }}
          >
            {formatDate(updated_at || created_at)}
          </Typography>

          {/* Assignee Avatar */}
          {assigned_to_name ? (
            <Tooltip title={assigned_to_name} arrow>
              <Avatar
                src={assigned_to_avatar}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.65rem',
                  bgcolor: getAvatarColor(assigned_to_name),
                }}
              >
                {assigned_to_name?.charAt(0)?.toUpperCase()}
              </Avatar>
            </Tooltip>
          ) : (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: '#E5E7EB',
              }}
            >
              <User size={12} color="#9CA3AF" />
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TicketCard;
