import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
} from '@mui/material';
import { Search, Filter } from 'lucide-react';
import { ticketService } from '../services/ticketService';

/**
 * TicketListView - Table view for tickets with filters.
 * 
 * Features:
 * - Search by ID or subject
 * - Filter by Status, Priority, Category
 * - Sortable columns
 * - Click to view ticket details
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onTicketClick - Handler for ticket click
 * @returns {JSX.Element} Ticket list view
 */
const TicketListView = ({ onTicketClick }) => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availableModules, setAvailableModules] = useState([]);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const response = await ticketService.getTickets(params);
      const ticketList = response.tickets || response || [];
      setTickets(ticketList);
      
      // Extract unique modules from tickets
      const modules = new Set();
      ticketList.forEach(ticket => {
        if (ticket.module_reference?.module) {
          modules.add(ticket.module_reference.module);
        }
      });
      setAvailableModules(Array.from(modules).sort());
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get ticket display ID (use ticket_number from backend)
  const getTicketDisplayId = (ticket) => {
    return ticket.ticket_number || ticket.id;
  };

  // Get priority chip style
  const getPriorityStyle = (priority) => {
    const styles = {
      Critical: { bg: '#FEE2E2', color: '#DC2626', label: 'Critical' },
      High: { bg: '#FEF3C7', color: '#D97706', label: 'High' },
      Medium: { bg: '#DBEAFE', color: '#2563EB', label: 'Medium' },
      Low: { bg: '#E5E7EB', color: '#6B7280', label: 'Low' },
    };
    return styles[priority] || styles.Medium;
  };

  // Get status chip style
  const getStatusStyle = (status) => {
    const styles = {
      'To Do': { bg: '#FEF3C7', color: '#D97706', icon: '○' },
      'In Progress': { bg: '#DBEAFE', color: '#2563EB', icon: '◐' },
      'Resolved': { bg: '#D1FAE5', color: '#059669', icon: '◉' },
      'Closed': { bg: '#E5E7EB', color: '#6B7280', icon: '●' },
    };
    return styles[status] || styles['To Do'];
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

  // Filter tickets by search and category
  const filteredTickets = tickets.filter(ticket => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        ticket.title?.toLowerCase().includes(query) ||
        getTicketDisplayId(ticket).toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    // Category/Module filter
    if (categoryFilter) {
      const ticketModule = ticket.module_reference?.module;
      if (ticketModule !== categoryFilter) return false;
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters Section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 2,
        p: 2,
        backgroundColor: '#F3F4F6',
        borderRadius: '8px',
      }}>
        <Filter size={18} color="#6B7280" />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
          FILTERS
        </Typography>
      </Box>

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {/* Search */}
        <TextField
          placeholder="Search by ID or subject..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ 
            flex: 1,
            maxWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#9CA3AF" />
              </InputAdornment>
            ),
          }}
        />

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
            sx={{ 
              borderRadius: '8px', 
              backgroundColor: '#F3F4F6',
              '& .MuiSelect-select': { py: 1 },
            }}
          >
            <MenuItem value="">Status</MenuItem>
            <MenuItem value="To Do">To Do</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
          </Select>
        </FormControl>

        {/* Priority Filter */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            displayEmpty
            sx={{ 
              borderRadius: '8px', 
              backgroundColor: '#F3F4F6',
              '& .MuiSelect-select': { py: 1 },
            }}
          >
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>
        </FormControl>

        {/* Module Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            displayEmpty
            sx={{ 
              borderRadius: '8px', 
              backgroundColor: '#F3F4F6',
              '& .MuiSelect-select': { py: 1 },
            }}
          >
            <MenuItem value="">All Modules</MenuItem>
            {availableModules.map(module => (
              <MenuItem key={module} value={module}>
                {module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '8px', boxShadow: 'none', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Subject</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#6B7280' }}>
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => {
                const priorityStyle = getPriorityStyle(ticket.priority);
                const statusStyle = getStatusStyle(ticket.status);
                const category = ticket.module_reference?.module || ticket.category || 'General';
                
                return (
                  <TableRow 
                    key={ticket.id}
                    onClick={() => onTicketClick(ticket.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#F9FAFB' },
                    }}
                  >
                    {/* ID */}
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#7C3AED', 
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                      >
                        {getTicketDisplayId(ticket)}
                      </Typography>
                    </TableCell>

                    {/* Subject */}
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#111827',
                          fontSize: '0.875rem',
                          maxWidth: 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ticket.title}
                      </Typography>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#6B7280',
                          fontSize: '0.875rem',
                        }}
                      >
                        {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Chip
                        label={priorityStyle.label}
                        size="small"
                        sx={{
                          backgroundColor: priorityStyle.bg,
                          color: priorityStyle.color,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: '24px',
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: statusStyle.color,
                          }}
                        />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: statusStyle.color,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          {ticket.status}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Updated */}
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#6B7280',
                          fontSize: '0.875rem',
                        }}
                      >
                        {formatDate(ticket.updated_at || ticket.created_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TicketListView;
