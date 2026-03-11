import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import DuplicateTicketModal from '../components/DuplicateTicketModal';

/**
 * TicketCreate - Form for creating new support tickets.
 * 
 * Per PRD:
 * - Title (max 200 chars)
 * - Description (max 10,000 chars)
 * - Priority (Low, Medium, High, Critical)
 * - Deduplication check before creation
 * 
 * @returns {JSX.Element} Ticket creation page
 */
const TicketCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine base path for navigation (support in admin vs regular)
  const basePath = location.pathname.startsWith('/admin') ? '/admin/support' : '/support';
  
  // Check for pending ticket data from duplicate check flow
  const pendingData = location.state?.pendingTicketData;
  
  const [formData, setFormData] = useState({
    title: pendingData?.title || '',
    description: pendingData?.description || '',
    priority: pendingData?.priority || 'Medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [titleError, setTitleError] = useState(null);
  const [descriptionError, setDescriptionError] = useState(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [existingTicket, setExistingTicket] = useState(null);
  const [isForceCreating, setIsForceCreating] = useState(false);

  const priorities = [
    { value: 'Low', label: 'P4 Low' },
    { value: 'Medium', label: 'P3 Normal' },
    { value: 'High', label: 'P2 High' },
    { value: 'Critical', label: 'P1 Critical' },
  ];

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === 'title') {
      if (value.length > 200) {
        setTitleError('Title must be 200 characters or less');
      } else {
        setTitleError(null);
      }
    }

    if (field === 'description') {
      if (value.length > 10000) {
        setDescriptionError('Description must be 10,000 characters or less');
      } else {
        setDescriptionError(null);
      }
    }
  };

  const validateForm = () => {
    let isValid = true;

    if (!formData.title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else if (formData.title.length > 200) {
      setTitleError('Title must be 200 characters or less');
      isValid = false;
    }

    if (!formData.description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else if (formData.description.length > 10000) {
      setDescriptionError('Description must be 10,000 characters or less');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event, forceCreate = false) => {
    if (event) event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await ticketService.createTicket({
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        force_create: forceCreate,
      });

      if (response.is_duplicate && !forceCreate) {
        // Show duplicate modal instead of navigating
        setExistingTicket(response.existing_ticket);
        setDuplicateModalOpen(true);
      } else {
        navigate(`${basePath}/tickets/${response.ticket_id || response.ticket?.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
      setIsForceCreating(false);
    }
  };

  const handleViewExisting = () => {
    setDuplicateModalOpen(false);
    if (existingTicket?.id) {
      navigate(`${basePath}/tickets/${existingTicket.id}`, {
        state: { 
          fromDuplicateCheck: true, 
          returnPath: `${basePath}/tickets/new`,
          pendingTicketData: {
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
          }
        }
      });
    }
  };

  const handleForceCreate = async () => {
    setIsForceCreating(true);
    setDuplicateModalOpen(false);
    await handleSubmit(null, true);
  };

  const handleCancel = () => {
    navigate(basePath);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowLeft size={16} />}
          onClick={handleCancel}
          sx={{
            textTransform: 'none',
            color: '#6B7280',
          }}
        >
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
          Create New Ticket
        </Typography>
      </Box>

      {/* Form Card */}
      <Card
        sx={{
          maxWidth: 800,
          mx: 'auto',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Title"
                placeholder="Brief summary of the issue"
                value={formData.title}
                onChange={handleChange('title')}
                error={!!titleError}
                helperText={titleError || `${formData.title.length}/200 characters`}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>

            {/* Description */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Description"
                placeholder="Detailed description of the issue, including steps to reproduce if applicable"
                value={formData.description}
                onChange={handleChange('description')}
                error={!!descriptionError}
                helperText={descriptionError || `${formData.description.length}/10,000 characters`}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>

            {/* Priority */}
            <Box sx={{ mb: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleChange('priority')}
                  label="Priority"
                  sx={{
                    borderRadius: '8px',
                  }}
                >
                  {priorities.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={isSubmitting}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  borderColor: '#E5E7EB',
                  color: '#374151',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                endIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#6366F1',
                  '&:hover': { backgroundColor: '#4F46E5' },
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Duplicate Ticket Modal */}
      <DuplicateTicketModal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        existingTicket={existingTicket}
        onViewExisting={handleViewExisting}
        onForceCreate={handleForceCreate}
        isManualTicket={true}
        isCreating={isForceCreating}
      />
    </Box>
  );
};

export default TicketCreate;
