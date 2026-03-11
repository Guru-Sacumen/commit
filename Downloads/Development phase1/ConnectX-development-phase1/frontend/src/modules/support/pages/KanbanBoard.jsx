import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Search, Filter, MoreHorizontal, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TicketCard from '../components/TicketCard';
import DroppableColumn from '../components/DroppableColumn';
import { boardService } from '../services/boardService';
import { useAuth } from '../../../common/hooks/useAuth';

/**
 * KanbanBoard - JIRA-style Kanban board for ticket management.
 * 
 * Per UI design:
 * - Four columns: To Do, In Progress, Resolved, Closed
 * - Each column shows ticket count and filter button
 * - Ticket cards with priority badges and assignee avatars
 * - Drag-and-drop for Super Admin only (Session 8)
 * 
 * @returns {JSX.Element} Kanban board page
 */
const KanbanBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Determine base path for navigation (support in admin vs regular)
  const basePath = location.pathname.startsWith('/admin') ? '/admin/support' : '/support';
  
  const [boardData, setBoardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check if user is Super Admin (can drag tickets to change status)
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
      const data = await boardService.getBoardData(filters);
      setBoardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
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

  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading && !boardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      {/* Jira-style Board Header */}
      <Box sx={{ 
        px: 3, 
        py: 2, 
        borderBottom: '1px solid #DFE1E6',
        backgroundColor: '#FFFFFF',
      }}>
        {/* Breadcrumb */}
        <Typography variant="caption" sx={{ color: '#5E6C84', fontSize: '0.75rem' }}>
          Projects / ConnectX
        </Typography>
        
        {/* Title Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#172B4D', fontSize: '1.5rem' }}>
            Board
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Team Avatars */}
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
              <Avatar sx={{ bgcolor: '#0052CC' }}>JD</Avatar>
              <Avatar sx={{ bgcolor: '#00875A' }}>AK</Avatar>
              <Avatar sx={{ bgcolor: '#FF5630' }}>SM</Avatar>
              <Avatar sx={{ bgcolor: '#6554C0' }}>RK</Avatar>
            </AvatarGroup>
          </Box>
        </Box>

        {/* Filter Bar - Jira Style */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
          {/* Search */}
          <TextField
            placeholder="Search"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              width: 200,
              '& .MuiOutlinedInput-root': {
                borderRadius: '3px',
                backgroundColor: '#FAFBFC',
                border: '2px solid #DFE1E6',
                '&:hover': { backgroundColor: '#EBECF0' },
                '&.Mui-focused': { 
                  backgroundColor: '#FFFFFF',
                  borderColor: '#4C9AFF',
                },
                '& fieldset': { border: 'none' },
              },
              '& .MuiInputBase-input': {
                padding: '6px 8px',
                fontSize: '0.875rem',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#6B778C" />
                </InputAdornment>
              ),
            }}
          />

          {/* Epic Dropdown */}
          <Button
            variant="text"
            endIcon={<ChevronDown size={14} />}
            sx={{
              textTransform: 'none',
              color: '#42526E',
              fontSize: '0.875rem',
              fontWeight: 400,
              '&:hover': { backgroundColor: '#EBECF0' },
            }}
          >
            Epic
          </Button>

          {/* Group By */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <Typography variant="body2" sx={{ color: '#6B778C', fontSize: '0.75rem' }}>
              GROUP BY
            </Typography>
            <Button
              variant="text"
              endIcon={<ChevronDown size={14} />}
              sx={{
                textTransform: 'none',
                color: '#42526E',
                fontSize: '0.875rem',
                fontWeight: 400,
                '&:hover': { backgroundColor: '#EBECF0' },
              }}
            >
              None
            </Button>
          </Box>

          {/* Insights */}
          <Button
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#42526E',
              fontSize: '0.875rem',
              fontWeight: 400,
              borderColor: '#DFE1E6',
              borderRadius: '3px',
              '&:hover': { backgroundColor: '#EBECF0', borderColor: '#DFE1E6' },
            }}
          >
            📊 Insights
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Jira-style Kanban Board with Horizontal Scroll */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '8px',
            p: 2,
            overflowX: 'auto',
            minHeight: 'calc(100vh - 180px)',
            backgroundColor: '#F4F5F7',
            alignItems: 'flex-start',
          }}
        >
          {boardData?.columns?.map((column) => (
            <DroppableColumn
              key={column.status}
              column={column}
              onTicketClick={handleTicketClick}
              onAddTicket={handleNewTicket}
              isDragDisabled={!isSuperAdmin}
            />
          ))}

          {/* Add Column Button */}
          <Box
            sx={{
              minWidth: '280px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(9, 30, 66, 0.04)',
              borderRadius: '3px',
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(9, 30, 66, 0.08)' },
            }}
          >
            <Plus size={16} color="#5E6C84" />
          </Box>
        </Box>

        {/* Drag Overlay - Shows dragged ticket */}
        <DragOverlay>
          {activeTicket ? (
            <TicketCard
              ticket={activeTicket}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Snackbar for status updates */}
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

export default KanbanBoard;
