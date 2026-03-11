import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Button,
  Chip,
  IconButton,
  Popover,
} from '@mui/material';
import { Search, X, Filter, Calendar } from 'lucide-react';

/**
 * TicketFilters - Filter controls for ticket list/board.
 * 
 * Per UI design, includes:
 * - Search tickets (320px width)
 * - Priority dropdown
 * - Status dropdown
 * - Created By dropdown
 * - Date Range dropdown
 * 
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {Function} props.onClearFilters - Clear all filters handler
 * @param {Array} props.users - List of users for Created By filter
 * @returns {JSX.Element} Filter controls component
 */
const TicketFilters = ({ 
  filters = {}, 
  onFilterChange, 
  onClearFilters,
  users = [] 
}) => {
  const [dateAnchorEl, setDateAnchorEl] = useState(null);

  const priorities = [
    { value: '', label: 'All Priorities' },
    { value: 'Critical', label: 'P1 Critical' },
    { value: 'High', label: 'P2 High' },
    { value: 'Medium', label: 'P3 Normal' },
    { value: 'Low', label: 'P4 Low' },
  ];

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'To Do', label: 'To Do' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Closed', label: 'Closed' },
  ];

  const dateRanges = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
  ];

  const handleSearchChange = (event) => {
    onFilterChange({ ...filters, search: event.target.value });
  };

  const handlePriorityChange = (event) => {
    onFilterChange({ ...filters, priority: event.target.value });
  };

  const handleStatusChange = (event) => {
    onFilterChange({ ...filters, status: event.target.value });
  };

  const handleCreatedByChange = (event) => {
    onFilterChange({ ...filters, created_by: event.target.value });
  };

  const handleDateRangeChange = (event) => {
    onFilterChange({ ...filters, date_range: event.target.value });
    setDateAnchorEl(null);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== '' && v !== null && v !== undefined
  ).length;

  const selectStyles = {
    minWidth: 140,
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      fontSize: '0.875rem',
      '& fieldset': {
        borderColor: '#E5E7EB',
      },
      '&:hover fieldset': {
        borderColor: '#D1D5DB',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#6366F1',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        p: 2,
        backgroundColor: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
      }}
    >
      {/* Search Input */}
      <TextField
        placeholder="Search tickets..."
        value={filters.search || ''}
        onChange={handleSearchChange}
        size="small"
        sx={{
          width: 320,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#E5E7EB',
            },
            '&:hover fieldset': {
              borderColor: '#D1D5DB',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} color="#9CA3AF" />
            </InputAdornment>
          ),
          endAdornment: filters.search && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => onFilterChange({ ...filters, search: '' })}
              >
                <X size={16} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Priority Filter */}
      <FormControl size="small" sx={selectStyles}>
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.priority || ''}
          onChange={handlePriorityChange}
          label="Priority"
        >
          {priorities.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Status Filter */}
      <FormControl size="small" sx={selectStyles}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          onChange={handleStatusChange}
          label="Status"
        >
          {statuses.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Created By Filter */}
      <FormControl size="small" sx={selectStyles}>
        <InputLabel>Created By</InputLabel>
        <Select
          value={filters.created_by || ''}
          onChange={handleCreatedByChange}
          label="Created By"
        >
          <MenuItem value="">All Users</MenuItem>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.full_name || user.email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Date Range Filter */}
      <FormControl size="small" sx={selectStyles}>
        <InputLabel>Date Range</InputLabel>
        <Select
          value={filters.date_range || ''}
          onChange={handleDateRangeChange}
          label="Date Range"
          startAdornment={
            <InputAdornment position="start">
              <Calendar size={16} color="#9CA3AF" />
            </InputAdornment>
          }
        >
          {dateRanges.map((d) => (
            <MenuItem key={d.value} value={d.value}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <Button
          variant="text"
          size="small"
          onClick={onClearFilters}
          startIcon={<X size={16} />}
          sx={{
            color: '#6B7280',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#F3F4F6',
            },
          }}
        >
          Clear ({activeFilterCount})
        </Button>
      )}
    </Box>
  );
};

export default TicketFilters;
