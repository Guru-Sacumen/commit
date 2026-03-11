import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  Snackbar,
  Menu,
} from '@mui/material';
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Activity,
  ChevronDown,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import CommentThread from '../components/CommentThread';
import FileAttachmentList from '../components/FileAttachmentList';
import TicketActivityTimeline from '../components/TicketActivityTimeline';
import { ticketService } from '../services/ticketService';
import { commentService } from '../services/commentService';
import { attachmentService } from '../services/attachmentService';
import { activityService } from '../services/activityService';
import { useAuth } from '../../../common/hooks/useAuth';

/**
 * TicketDetail - Jira-style detailed view of a single ticket.
 * 
 * Features:
 * - Inline editing for title and description (click to edit)
 * - Status dropdown (Super Admin only)
 * - Priority dropdown (Super Admin only)
 * - Labels showing source module
 * - RBAC: Users can only edit their own tickets
 * 
 * @returns {JSX.Element} Ticket detail page
 */
const TicketDetail = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Determine base path for navigation (support in admin vs regular)
  const basePath = location.pathname.startsWith('/admin') ? '/admin/support' : '/support';
  
  // Check if navigated from duplicate check
  const fromDuplicateCheck = location.state?.fromDuplicateCheck;
  const returnPath = location.state?.returnPath;
  const pendingTicketData = location.state?.pendingTicketData;
  
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  
  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [assignees, setAssignees] = useState([]);
  const [assigneeMenuAnchor, setAssigneeMenuAnchor] = useState(null);

  // Get user ID from user object or decode from JWT token
  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.user_id || '';
      }
    } catch (e) {
      return '';
    }
    return '';
  };
  
  const currentUserId = user?.id || getUserIdFromToken() || localStorage.getItem('user_id') || '';
  const isSuperAdmin = user?.superadmin === true || user?.superadmin === 'true';
  const userRole = user?.role || localStorage.getItem('connectx_role') || '';
  const isAdmin = userRole === 'ADMIN' || userRole === 'admin';
  const isTicketCreator = ticket?.created_by === currentUserId || ticket?.created_by_user_id === currentUserId || 
    String(ticket?.created_by) === String(currentUserId) || String(ticket?.created_by_user_id) === String(currentUserId);
  
  // Check if current user can edit this ticket per PRD 7.5
  // Super Admin: Can only modify ticket status (NOT title/description/priority)
  // Admin: Can edit tickets in their tenant (title, description, priority)
  // User (MEMBER): Can edit their own tickets (title, description, priority)
  const canEdit = !isSuperAdmin && (isAdmin || isTicketCreator);
  const canChangeStatus = isSuperAdmin;  // Only Super Admin can change status
  const canChangePriority = canEdit;  // Only Admin and User can change priority

  const fetchTicket = async () => {
    try {
      const data = await ticketService.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err.message || 'Failed to load ticket');
    }
  };

  const fetchComments = async () => {
    try {
      const data = await commentService.getComments(ticketId);
      setComments(data.comments || data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const fetchAttachments = async () => {
    try {
      const data = await attachmentService.getAttachments(ticketId);
      setAttachments(data.attachments || data || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
  };

  const fetchActivity = async (page = 1) => {
    try {
      const data = await activityService.getActivity(ticketId, { page, page_size: 20 });
      if (page === 1) {
        setActivity(data.events || []);
      } else {
        setActivity((prev) => [...prev, ...(data.events || [])]);
      }
      setHasMoreActivity(data.has_more || false);
      setActivityPage(page);
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchTicket();
      await Promise.all([fetchComments(), fetchAttachments(), fetchActivity()]);
      setIsLoading(false);
    };
    loadData();
  }, [ticketId]);

  const handleAddComment = async (commentData) => {
    try {
      await commentService.addComment(ticketId, commentData);
      await fetchComments();
      await fetchActivity();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleEditComment = async (commentId, updateData) => {
    try {
      await commentService.updateComment(ticketId, commentId, updateData);
      await fetchComments();
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.deleteComment(ticketId, commentId);
      await fetchComments();
      await fetchActivity();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleUploadAttachment = async (file, onProgress) => {
    await attachmentService.uploadAttachment(ticketId, file, onProgress);
    await fetchAttachments();
    await fetchActivity();
  };

  const handleDownloadAttachment = async (attachmentId) => {
    try {
      const data = await attachmentService.getDownloadUrl(ticketId, attachmentId);
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await attachmentService.deleteAttachment(ticketId, attachmentId);
      await fetchAttachments();
      await fetchActivity();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const handleLoadMoreActivity = () => {
    fetchActivity(activityPage + 1);
  };

  // Inline editing handlers
  const handleStartEditTitle = () => {
    if (!canEdit) return;
    setEditTitle(ticket.title);
    setIsEditingTitle(true);
  };

  const handleStartEditDescription = () => {
    if (!canEdit) return;
    setEditDescription(ticket.description || '');
    setIsEditingDescription(true);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditTitle('');
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setEditDescription('');
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) {
      setSnackbar({ open: true, message: 'Title cannot be empty', severity: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      await ticketService.updateTicket(ticketId, { title: editTitle.trim() });
      await fetchTicket();
      await fetchActivity();
      setIsEditingTitle(false);
      setSnackbar({ open: true, message: 'Title updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update title', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      await ticketService.updateTicket(ticketId, { description: editDescription });
      await fetchTicket();
      await fetchActivity();
      setIsEditingDescription(false);
      setSnackbar({ open: true, message: 'Description updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update description', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!canChangeStatus) return;
    setIsSaving(true);
    try {
      await ticketService.changeStatus(ticketId, newStatus);
      await fetchTicket();
      await fetchActivity();
      setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update status', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!canChangePriority) return;
    setIsSaving(true);
    try {
      await ticketService.updateTicket(ticketId, { priority: newPriority });
      await fetchTicket();
      await fetchActivity();
      setSnackbar({ open: true, message: 'Priority updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to update priority', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAssignees = async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await ticketService.getAssignees();
      setAssignees(data || []);
    } catch (err) {
      console.error('Failed to fetch assignees:', err);
    }
  };

  const handleAssigneeClick = (event) => {
    if (!isSuperAdmin) return;
    setAssigneeMenuAnchor(event.currentTarget);
    if (assignees.length === 0) {
      fetchAssignees();
    }
  };

  const handleAssigneeClose = () => {
    setAssigneeMenuAnchor(null);
  };

  const handleAssigneeChange = async (assigneeId) => {
    setAssigneeMenuAnchor(null);
    if (!isSuperAdmin) return;
    setIsSaving(true);
    try {
      await ticketService.assignTicket(ticketId, assigneeId);
      await fetchTicket();
      await fetchActivity();
      setSnackbar({ open: true, message: 'Assignee updated successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || err.message || 'Failed to update assignee', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Get module label from module_reference
  const getModuleLabel = () => {
    if (!ticket?.module_reference?.module) return null;
    const moduleLabels = {
      integration_library: 'Integration Library',
      lab: 'Lab',
      automated_testing: 'Automated Testing',
      agentic_monitor: 'Agentic Monitor',
    };
    return moduleLabels[ticket.module_reference.module] || ticket.module_reference.module;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate(basePath)} sx={{ mt: 2 }}>
          Back to Board
        </Button>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Ticket not found</Alert>
        <Button onClick={() => navigate(basePath)} sx={{ mt: 2 }}>
          Back to Board
        </Button>
      </Box>
    );
  }

  // Get priority display info
  const getPriorityInfo = (priority) => {
    const priorities = {
      Critical: { label: 'P1 Critical', color: '#DC2626', bg: '#FEE2E2' },
      High: { label: 'P2 High', color: '#D97706', bg: '#FEF3C7' },
      Medium: { label: 'P3 Normal', color: '#2563EB', bg: '#DBEAFE' },
      Low: { label: 'P4 Low', color: '#6B7280', bg: '#F3F4F6' },
    };
    return priorities[priority] || priorities.Medium;
  };

  const priorityInfo = getPriorityInfo(ticket.priority);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#FAFAFA', minHeight: '100vh', overflow: 'auto' }}>
      {/* Header - Back button and Ticket ID */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(basePath)}
          sx={{ 
            textTransform: 'none', 
            color: '#6B7280',
            fontWeight: 400,
            '&:hover': { backgroundColor: 'transparent', color: '#374151' },
          }}
        >
          Back
        </Button>
        <Typography
          variant="body2"
          sx={{ color: '#6B7280', fontWeight: 500 }}
        >
          #{ticket.ticket_number || ticket.id}
        </Typography>
        
        {/* Back to Create Ticket button - shown when navigated from duplicate check */}
        {fromDuplicateCheck && returnPath && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(returnPath, { state: { pendingTicketData } })}
            sx={{ 
              ml: 'auto',
              textTransform: 'none', 
              borderColor: '#6366F1',
              color: '#6366F1',
              borderRadius: '6px',
              '&:hover': { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
            }}
          >
            Back to Create Ticket
          </Button>
        )}
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 },
        alignItems: 'flex-start',
      }}>
        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Ticket Info Card - Jira Style */}
          <Card
            sx={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: 'none',
              mb: 2,
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              {/* Title - Inline Editable */}
              {isEditingTitle ? (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    variant="outlined"
                    size="small"
                    disabled={isSaving}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.5rem',
                        fontWeight: 600,
                      },
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEditTitle();
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={handleSaveTitle}
                      disabled={isSaving}
                      sx={{ bgcolor: '#2563EB', color: 'white', '&:hover': { bgcolor: '#1D4ED8' } }}
                    >
                      <Check size={16} />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={handleCancelEditTitle}
                      disabled={isSaving}
                      sx={{ bgcolor: '#F3F4F6', '&:hover': { bgcolor: '#E5E7EB' } }}
                    >
                      <X size={16} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 1, 
                    mb: 2,
                    cursor: canEdit ? 'pointer' : 'default',
                    p: 1,
                    mx: -1,
                    borderRadius: '4px',
                    '&:hover': canEdit ? { 
                      backgroundColor: '#F9FAFB',
                      '& .edit-icon': { opacity: 1 }
                    } : {},
                  }}
                  onClick={handleStartEditTitle}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', flex: 1, fontSize: '1.15rem' }}>
                    {ticket.title}
                  </Typography>
                  {canEdit && (
                    <Tooltip title="Click to edit">
                      <Edit2 
                        size={16} 
                        className="edit-icon"
                        style={{ opacity: 0.5, color: '#6B7280', marginTop: 4, transition: 'opacity 0.2s' }} 
                      />
                    </Tooltip>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Description - Inline Editable */}
              <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1, fontWeight: 500 }}>
                Description
              </Typography>
              {isEditingDescription ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    autoFocus
                    variant="outlined"
                    disabled={isSaving}
                    placeholder="Add a description..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={handleSaveDescription}
                      disabled={isSaving}
                      sx={{ bgcolor: '#2563EB', color: 'white', '&:hover': { bgcolor: '#1D4ED8' } }}
                    >
                      <Check size={16} />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={handleCancelEditDescription}
                      disabled={isSaving}
                      sx={{ bgcolor: '#F3F4F6', '&:hover': { bgcolor: '#E5E7EB' } }}
                    >
                      <X size={16} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    cursor: canEdit ? 'pointer' : 'default',
                    p: 1.5,
                    mx: -1.5,
                    borderRadius: '4px',
                    minHeight: '80px',
                    '&:hover': canEdit ? { 
                      backgroundColor: '#F9FAFB',
                      '& .edit-icon': { opacity: 1 }
                    } : {},
                  }}
                  onClick={handleStartEditDescription}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{ color: ticket.description ? '#4B5563' : '#9CA3AF', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1 }}
                    >
                      {ticket.description || 'Click to add a description...'}
                    </Typography>
                    {canEdit && (
                      <Tooltip title="Click to edit">
                        <Edit2 
                          size={16} 
                          className="edit-icon"
                          style={{ opacity: 0.5, color: '#6B7280', transition: 'opacity 0.2s' }} 
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Tabs Card */}
          <Card
            sx={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: 'none',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                borderBottom: '1px solid #E5E7EB',
                px: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: 48,
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  '&.Mui-selected': {
                    color: '#2563EB',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#2563EB',
                },
              }}
            >
              <Tab
                icon={<MessageSquare size={16} />}
                iconPosition="start"
                label={`Comments (${comments.length})`}
                sx={{ gap: 1 }}
              />
              <Tab
                icon={<Paperclip size={16} />}
                iconPosition="start"
                label={`Attachments (${attachments.length})`}
                sx={{ gap: 1 }}
              />
              <Tab
                icon={<Activity size={16} />}
                iconPosition="start"
                label="Activity"
                sx={{ gap: 1 }}
              />
            </Tabs>

            <CardContent sx={{ p: 3 }}>
              {activeTab === 0 && (
                <CommentThread
                  comments={comments}
                  onAddComment={handleAddComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                  isSuperAdmin={isSuperAdmin}
                />
              )}
              {activeTab === 1 && (
                <FileAttachmentList
                  attachments={attachments}
                  onUpload={handleUploadAttachment}
                  onDownload={handleDownloadAttachment}
                  onDelete={handleDeleteAttachment}
                  canUpload={true}
                  canDelete={isSuperAdmin || ticket.created_by_user_id === currentUserId}
                />
              )}
              {activeTab === 2 && (
                <TicketActivityTimeline
                  events={activity}
                  hasMore={hasMoreActivity}
                  onLoadMore={handleLoadMoreActivity}
                />
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Sidebar - Details */}
        <Box sx={{ 
          width: { xs: '100%', md: '260px' },
          flexShrink: 0,
        }}>
          <Card
            sx={{
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: 'none',
              position: 'sticky',
              top: 24,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 2, fontSize: '1rem' }}>
                Details
              </Typography>

              {/* Status Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Status:
                </Typography>
                {canChangeStatus ? (
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={isSaving}
                      sx={{
                        borderRadius: '4px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        '& .MuiSelect-select': { py: 0.5, px: 1.5 },
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        '&:hover': { backgroundColor: '#2563EB' },
                      }}
                      IconComponent={() => <ChevronDown size={14} style={{ marginRight: 4, color: '#FFFFFF' }} />}
                    >
                      <MenuItem value="To Do">To Do</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Chip
                    label={ticket.status}
                    size="small"
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      height: '24px',
                    }}
                  />
                )}
              </Box>

              {/* Assignee Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Assignee:
                </Typography>
                <Box 
                  onClick={handleAssigneeClick}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    cursor: isSuperAdmin ? 'pointer' : 'default',
                    '&:hover': isSuperAdmin ? { opacity: 0.8 } : {},
                  }}
                >
                  {ticket.assigned_to_name ? (
                    <>
                      <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: '#3B82F6' }}>
                        {ticket.assigned_to_name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.85rem' }}>
                        {ticket.assigned_to_name}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                      Unassigned
                    </Typography>
                  )}
                </Box>
              </Box>
              {isSuperAdmin && (
                <Menu
                  anchorEl={assigneeMenuAnchor}
                  open={Boolean(assigneeMenuAnchor)}
                  onClose={handleAssigneeClose}
                  PaperProps={{
                    sx: { mt: 1, minWidth: 180, borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
                  }}
                >
                  {assignees.length === 0 ? (
                    <MenuItem disabled>
                      <CircularProgress size={14} sx={{ mr: 1 }} />
                      Loading...
                    </MenuItem>
                  ) : (
                    assignees.map((assignee) => (
                      <MenuItem
                        key={assignee.id}
                        onClick={() => handleAssigneeChange(assignee.id)}
                        selected={ticket.assigned_to_user_id === assignee.id}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, fontSize: '0.85rem' }}
                      >
                        <Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem', bgcolor: '#3B82F6' }}>
                          {assignee.full_name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        {assignee.full_name}
                      </MenuItem>
                    ))
                  )}
                </Menu>
              )}

              {/* Reporter Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Reporter:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: '#DC2626' }}>
                    {ticket.created_by_name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.85rem' }}>
                    {ticket.created_by_name || 'Unknown'}
                  </Typography>
                </Box>
              </Box>

              {/* Labels Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Labels:
                </Typography>
                {getModuleLabel() ? (
                  <Chip
                    label={getModuleLabel()}
                    size="small"
                    sx={{
                      backgroundColor: '#DBEAFE',
                      color: '#1D4ED8',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      height: '22px',
                    }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                    None
                  </Typography>
                )}
              </Box>

              {/* Priority Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Priority:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    width: 0, height: 0, 
                    borderLeft: '5px solid transparent', 
                    borderRight: '5px solid transparent', 
                    borderBottom: `8px solid ${priorityInfo.color}` 
                  }} />
                  <Typography variant="body2" sx={{ color: priorityInfo.color, fontWeight: 600, fontSize: '0.85rem' }}>
                    {ticket.priority}
                  </Typography>
                </Box>
              </Box>

              {/* Created Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Created:
                </Typography>
                <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.85rem' }}>
                  {formatDate(ticket.created_at)}
                </Typography>
              </Box>

              {/* Updated Row */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, minWidth: 70 }}>
                  Updated:
                </Typography>
                <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.85rem' }}>
                  {formatDate(ticket.updated_at)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TicketDetail;
