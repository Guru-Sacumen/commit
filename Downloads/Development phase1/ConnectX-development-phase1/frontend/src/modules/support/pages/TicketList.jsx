import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Pagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus, RefreshCw, Eye, List, LayoutGrid } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import TicketFilters from '../components/TicketFilters';
import { ticketService } from '../services/ticketService';

/**
 * TicketList - Table view of all tickets with filters and pagination.
 * 
 * @returns {JSX.Element} Ticket list page
 */
const TicketList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine base path for navigation (support in admin vs regular)
  const basePath = location.pathname.startsWith('/admin') ? '/admin/support' : '/support';
  
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTickets({
        ...filters,
        page,
        page_size: pageSize,
      });
      setTickets(data.tickets || data || []);
      setTotalPages(Math.ceil((data.total || data.length || 0) / pageSize));
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters, page]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleTicketClick = (ticketId) => {
    navigate(`${basePath}/tickets/${ticketId}`);
  };

  const handleNewTicket = () => {
    navigate(`${basePath}/tickets/new`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
            All Tickets
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            View and manage all support tickets
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Board View">
            <IconButton onClick={() => navigate(basePath)}>
              <LayoutGrid size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchTickets} disabled={isLoading}>
              <RefreshCw size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleNewTicket}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              backgroundColor: '#6366F1',
              '&:hover': { backgroundColor: '#4F46E5' },
            }}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <TicketFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Table */}
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: 'none',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Assignee</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        No tickets found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleTicketClick(ticket.id)}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', color: '#6B7280', fontSize: '0.75rem' }}
                        >
                          #{ticket.id?.substring(0, 8)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: '#111827', maxWidth: 300 }}
                          noWrap
                        >
                          {ticket.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} size="small" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          {ticket.assigned_to_name || 'Unassigned'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTicketClick(ticket.id);
                            }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TicketList;
