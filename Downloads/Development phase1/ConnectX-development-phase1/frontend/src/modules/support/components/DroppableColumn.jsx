import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Typography, Chip } from '@mui/material';
import DraggableTicketCard from './DraggableTicketCard';

/**
 * DroppableColumn - Support Portal Kanban column with drop zone for tickets.
 * 
 * Per screenshot design:
 * - White background with colored header bar
 * - Column title with ticket count badge
 * - Vertical scroll for tickets
 * 
 * @param {Object} props - Component props
 * @param {Object} props.column - Column data with status and tickets
 * @param {Function} props.onTicketClick - Ticket click handler
 * @param {Function} props.onAddTicket - Add ticket handler
 * @param {boolean} props.isDragDisabled - Whether dragging is disabled
 * @returns {JSX.Element} Droppable column component
 */
const DroppableColumn = ({ 
  column, 
  onTicketClick, 
  onAddTicket, 
  isDragDisabled = false 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: {
      type: 'column',
      status: column.status,
    },
  });

  const ticketIds = column.tickets?.map(t => t.id) || [];
  const ticketCount = column.ticket_count || column.tickets?.length || 0;

  // Get column header style based on status
  const getColumnStyle = (status) => {
    const styles = {
      'To Do': { 
        headerBg: '#FEF3C7', 
        headerColor: '#92400E',
        borderColor: '#FDE68A',
      },
      'In Progress': { 
        headerBg: '#DBEAFE', 
        headerColor: '#1E40AF',
        borderColor: '#BFDBFE',
      },
      'Resolved': { 
        headerBg: '#D1FAE5', 
        headerColor: '#065F46',
        borderColor: '#A7F3D0',
      },
      'Completed': { 
        headerBg: '#D1FAE5', 
        headerColor: '#065F46',
        borderColor: '#A7F3D0',
      },
      'Closed': { 
        headerBg: '#E5E7EB', 
        headerColor: '#374151',
        borderColor: '#D1D5DB',
      },
    };
    return styles[status] || styles['To Do'];
  };

  const columnStyle = getColumnStyle(column.status);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        backgroundColor: isOver ? '#F0F9FF' : '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isOver ? '#3B82F6' : '#E5E7EB'}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '400px',
        maxHeight: 'calc(100vh - 280px)',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Column Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: columnStyle.headerBg,
          borderBottom: `1px solid ${columnStyle.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 600, 
              color: columnStyle.headerColor,
              fontSize: '0.875rem',
            }}
          >
            {column.title || column.status}
          </Typography>
          <Chip
            label={ticketCount}
            size="small"
            sx={{
              height: '22px',
              minWidth: '22px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              color: columnStyle.headerColor,
              '& .MuiChip-label': {
                px: 0.75,
              },
            }}
          />
        </Box>
      </Box>

      {/* Column Content - Scrollable */}
      <Box
        sx={{
          flex: 1,
          p: 1.5,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#D1D5DB',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#9CA3AF',
          },
        }}
      >
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {column.tickets?.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100px',
                color: '#9CA3AF',
                fontSize: '0.875rem',
                border: isOver ? '2px dashed #3B82F6' : '2px dashed #E5E7EB',
                borderRadius: '8px',
                backgroundColor: isOver ? '#EFF6FF' : 'transparent',
              }}
            >
              {isOver ? 'Drop here' : 'No tickets'}
            </Box>
          ) : (
            column.tickets?.map((ticket) => (
              <DraggableTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick(ticket.id)}
                isDragDisabled={isDragDisabled}
              />
            ))
          )}
        </SortableContext>
      </Box>
    </Box>
  );
};

export default DroppableColumn;
