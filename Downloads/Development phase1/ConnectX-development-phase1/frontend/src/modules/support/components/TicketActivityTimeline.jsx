import React from 'react';
import { Box, Typography, Avatar, Chip, CircularProgress } from '@mui/material';
import {
  PlusCircle,
  ArrowRight,
  UserPlus,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Trash2,
  RotateCcw,
  Activity,
} from 'lucide-react';

/**
 * TicketActivityTimeline - Chronological event list for ticket detail page.
 * 
 * Displays audit events with icons, actor names, and timestamps.
 * Event types: ticket_created, status_changed, assignment_changed,
 * escalation_created, comment_added, attachment_uploaded,
 * attachment_deleted, ticket_reopened.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.events - List of activity events
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.hasMore - Whether more events are available
 * @param {Function} props.onLoadMore - Load more handler
 * @returns {JSX.Element} Activity timeline component
 */
const TicketActivityTimeline = ({
  events = [],
  isLoading = false,
  hasMore = false,
  onLoadMore,
}) => {
  const eventConfig = {
    ticket_created: {
      icon: PlusCircle,
      color: '#059669',
      bgColor: '#D1FAE5',
      label: 'Created',
    },
    status_changed: {
      icon: ArrowRight,
      color: '#2563EB',
      bgColor: '#DBEAFE',
      label: 'Status Changed',
    },
    assignment_changed: {
      icon: UserPlus,
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      label: 'Assigned',
    },
    escalation_created: {
      icon: AlertTriangle,
      color: '#DC2626',
      bgColor: '#FEE2E2',
      label: 'Escalated',
    },
    comment_added: {
      icon: MessageSquare,
      color: '#6366F1',
      bgColor: '#EEF2FF',
      label: 'Commented',
    },
    attachment_uploaded: {
      icon: Paperclip,
      color: '#0891B2',
      bgColor: '#CFFAFE',
      label: 'Attached',
    },
    attachment_deleted: {
      icon: Trash2,
      color: '#DC2626',
      bgColor: '#FEE2E2',
      label: 'Removed Attachment',
    },
    ticket_reopened: {
      icon: RotateCcw,
      color: '#EA580C',
      bgColor: '#FFEDD5',
      label: 'Reopened',
    },
    priority_changed: {
      icon: Activity,
      color: '#CA8A04',
      bgColor: '#FEF9C3',
      label: 'Priority Changed',
    },
  };

  const getEventConfig = (eventType) => {
    return eventConfig[eventType] || {
      icon: Activity,
      color: '#6B7280',
      bgColor: '#F3F4F6',
      label: 'Activity',
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Backend stores timestamps in UTC - ensure proper parsing
    // If the date string doesn't have timezone info, treat it as UTC
    let date;
    if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-')) {
      date = new Date(dateString);
    } else {
      // Append 'Z' to treat as UTC
      date = new Date(dateString + 'Z');
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 0) {
      // Future date (clock skew) - show as just now
      return 'Just now';
    } else if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatFullDate = (dateString) => {
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

  if (isLoading && events.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Activity size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          No activity yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Timeline Line */}
      <Box
        sx={{
          position: 'absolute',
          left: 19,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#E5E7EB',
          zIndex: 0,
        }}
      />

      {/* Events */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((event, index) => {
          const config = getEventConfig(event.event_type);
          const IconComponent = config.icon;

          return (
            <Box
              key={event.id}
              sx={{
                display: 'flex',
                gap: 2,
                position: 'relative',
                pb: index === events.length - 1 ? 0 : 2,
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: config.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  border: '3px solid #FFFFFF',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={16} color={config.color} />
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, pt: 0.5 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Avatar
                    src={event.actor_avatar}
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: '0.6rem',
                      bgcolor: '#6366F1',
                    }}
                  >
                    {event.actor_name?.charAt(0)?.toUpperCase() || 'S'}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}
                  >
                    {event.actor_name || 'System'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: '#6B7280', fontSize: '0.875rem' }}
                  >
                    {event.description}
                  </Typography>
                </Box>

                {/* Timestamp */}
                <Typography
                  variant="caption"
                  sx={{ color: '#9CA3AF', fontSize: '0.7rem' }}
                  title={formatFullDate(event.created_at)}
                >
                  {formatDate(event.created_at)}
                </Typography>

                {/* Event Data Details */}
                {event.event_data && (
                  <Box sx={{ mt: 1 }}>
                    {event.event_type === 'status_changed' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={event.event_data.old_status}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: '#F3F4F6',
                            color: '#6B7280',
                          }}
                        />
                        <ArrowRight size={14} color="#9CA3AF" />
                        <Chip
                          size="small"
                          label={event.event_data.new_status}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: '#DBEAFE',
                            color: '#2563EB',
                          }}
                        />
                      </Box>
                    )}
                    {event.event_type === 'priority_changed' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={event.event_data.old_priority}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: '#F3F4F6',
                            color: '#6B7280',
                          }}
                        />
                        <ArrowRight size={14} color="#9CA3AF" />
                        <Chip
                          size="small"
                          label={event.event_data.new_priority}
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Load More */}
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="body2"
            onClick={onLoadMore}
            sx={{
              color: '#6366F1',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {isLoading ? 'Loading...' : 'Load more activity'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TicketActivityTimeline;
