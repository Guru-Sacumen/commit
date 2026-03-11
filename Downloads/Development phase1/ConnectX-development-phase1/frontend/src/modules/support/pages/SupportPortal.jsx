import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TicketCard from '../components/TicketCard';
import DroppableColumn from '../components/DroppableColumn';
import TicketListView from './TicketListView';
import { boardService } from '../services/boardService';
import { useAuth } from '../../../common/hooks/useAuth';

/**
 * SupportPortal - Main Support Portal page with Board View and List View.
 * 
 * Features:
 * - Toggle between Board View (Kanban) and List View (Table)
 * - Board View: 3 columns (To Do, In Progress, Completed)
 * - List View: Filterable table with all tickets
 * - New Ticket button
 * - Drag-and-drop for Super Admin only
 * 
 * @returns {JSX.Element} Support Portal page
 */
const SupportPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Determine base path for navigation (support in admin vs regular)
  const basePath = location.pathname.startsWith('/admin') ? '/admin/support' : '/support';
  
  const [viewMode, setViewMode] = useState('board');
  const [boardData, setBoardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check if user is Super Admin (can drag tickets)
  const isSuperAdmin = user?.superadmin === true || user?.superadmin === 'true';

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection that prioritizes columns over tickets
  const customCollisionDetection = (args) => {
    // First check for pointer within droppable areas
    const pointerCollisions = pointerWithin(args);
    
    // Filter to only get column collisions (not ticket collisions)
    const columnCollisions = pointerCollisions.filter(
      collision => collision.data?.droppableContainer?.data?.current?.type === 'column'
    );
    
    // If we have column collisions, use those
    if (columnCollisions.length > 0) {
      return columnCollisions;
    }
    
    // If pointer is within a ticket, find which column that ticket belongs to
    if (pointerCollisions.length > 0) {
      const ticketCollision = pointerCollisions.find(
        collision => collision.data?.droppableContainer?.data?.current?.type === 'ticket'
      );
      if (ticketCollision) {
        const ticketData = ticketCollision.data?.droppableContainer?.data?.current?.ticket;
        if (ticketData?.status) {
          // Find the column with this status
          const columnCollision = args.droppableContainers.find(
            container => container.data?.current?.type === 'column' && 
                        container.data?.current?.status === ticketData.status
          );
          if (columnCollision) {
            return [{ id: columnCollision.id, data: columnCollision }];
          }
        }
      }
    }
    
    // Fallback to rect intersection for broader detection
    return rectIntersection(args);
  };

  const fetchBoardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await boardService.getBoardData({});
      setBoardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  const handleTicketClick = (ticketId) => {
    navigate(`${basePath}/tickets/${ticketId}`);
  };

  const handleNewTicket = () => {
    navigate(`${basePath}/tickets/new`);
  };

  // Drag and Drop Handlers
  const handleDragStart = (event) => {
    const { active } = event;
    const ticket = findTicketById(active.id);
    setActiveTicket(ticket);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id;
    
    // Determine the target status - could be dropping on a column or on a ticket
    let newStatus;
    if (over.data?.current?.type === 'column') {
      // Dropped on a column
      newStatus = over.data.current.status;
    } else if (over.data?.current?.type === 'ticket') {
      // Dropped on a ticket - find which column that ticket belongs to
      const targetTicket = over.data.current.ticket;
      newStatus = targetTicket?.status;
    } else {
      // Fallback: check if over.id matches a column status
      const matchingColumn = boardData?.columns?.find(col => col.status === over.id);
      if (matchingColumn) {
        newStatus = matchingColumn.status;
      } else {
        // over.id might be a ticket ID, find its column
        for (const col of boardData?.columns || []) {
          if (col.tickets?.some(t => t.id === over.id)) {
            newStatus = col.status;
            break;
          }
        }
      }
    }

    if (!newStatus) return;

    // Find current status
    const currentColumn = boardData?.columns?.find(col => 
      col.tickets?.some(t => t.id === ticketId)
    );
    const currentStatus = currentColumn?.status;

    if (currentStatus === newStatus) return;

    // Optimistic update
    const previousBoardData = { ...boardData };
    const updatedColumns = boardData.columns.map(col => {
      if (col.status === currentStatus) {
        return {
          ...col,
          tickets: col.tickets.filter(t => t.id !== ticketId),
          ticket_count: col.ticket_count - 1,
        };
      }
      if (col.status === newStatus) {
        const ticket = currentColumn.tickets.find(t => t.id === ticketId);
        return {
          ...col,
          tickets: [...col.tickets, { ...ticket, status: newStatus }],
          ticket_count: col.ticket_count + 1,
        };
      }
      return col;
    });

    setBoardData({ ...boardData, columns: updatedColumns });

    try {
      await boardService.updateTicketStatus(ticketId, newStatus);
      setSnackbar({
        open: true,
        message: `Ticket moved to ${newStatus}`,
        severity: 'success',
      });
    } catch (err) {
      // Rollback on error
      setBoardData(previousBoardData);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to update ticket status',
        severity: 'error',
      });
    }
  };

  const handleDragCancel = () => {
    setActiveTicket(null);
  };

  const findTicketById = (id) => {
    for (const column of boardData?.columns || []) {
      const ticket = column.tickets?.find(t => t.id === id);
      if (ticket) return ticket;
    }
    return null;
  };

  if (isLoading && !boardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1A1A1A', mb: 0.5 }}>
            Support Portal
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666' }}>
            Raise tickets, track issues, and access execution reports.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleNewTicket}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            backgroundColor: '#7C3AED',
            px: 2.5,
            py: 1,
            fontWeight: 500,
            '&:hover': { backgroundColor: '#6D28D9' },
          }}
        >
          New Ticket
        </Button>
      </Box>

      {/* View Toggle */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E5E5',
            '& .MuiToggleButton-root': {
              border: 'none',
              textTransform: 'none',
              px: 2,
              py: 0.75,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#666666',
              '&.Mui-selected': {
                backgroundColor: '#F3F4F6',
                color: '#1A1A1A',
              },
              '&:hover': {
                backgroundColor: '#F9FAFB',
              },
            },
          }}
        >
          <ToggleButton value="board">
            <LayoutGrid size={16} style={{ marginRight: 6 }} />
            Board View
          </ToggleButton>
          <ToggleButton value="list">
            <List size={16} style={{ marginRight: 6 }} />
            List View
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: { xs: 1.5, md: 2 },
              minHeight: '500px',
              overflowX: 'auto',
            }}
          >
            {boardData?.columns?.filter(col => 
              ['To Do', 'In Progress', 'Resolved'].includes(col.status)
            ).map((column) => (
              <DroppableColumn
                key={column.status}
                column={column}
                onTicketClick={handleTicketClick}
                onAddTicket={handleNewTicket}
                isDragDisabled={!isSuperAdmin}
              />
            ))}
          </Box>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTicket ? (
              <TicketCard
                ticket={activeTicket}
                isDragging={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <TicketListView onTicketClick={handleTicketClick} />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default SupportPortal;
