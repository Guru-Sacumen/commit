import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import { 
  Send, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Lock, 
  Eye 
} from 'lucide-react';

/**
 * CommentThread - Threaded comments display with visibility control.
 * 
 * Features:
 * - Nested comments with visibility badge (internal/user)
 * - Author avatar and timestamp
 * - Add/Edit/Delete comment actions
 * - Internal comments only visible to Super Admin
 * 
 * @param {Object} props - Component props
 * @param {Array} props.comments - List of comments
 * @param {Function} props.onAddComment - Add comment handler
 * @param {Function} props.onEditComment - Edit comment handler
 * @param {Function} props.onDeleteComment - Delete comment handler
 * @param {string} props.currentUserId - Current user ID
 * @param {boolean} props.isSuperAdmin - Whether current user is Super Admin
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} Comment thread component
 */
const CommentThread = ({
  comments = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  currentUserId,
  isSuperAdmin = false,
  isLoading = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState(null);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    onAddComment({
      body: newComment.trim(),
      visibility: isInternal ? 'internal' : 'user',
    });
    setNewComment('');
    setIsInternal(false);
  };

  const handleEditSubmit = (commentId) => {
    if (!editContent.trim()) return;
    
    onEditComment(commentId, { body: editContent.trim() });
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleMenuOpen = (event, commentId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedCommentId(commentId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedCommentId(null);
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.body || comment.content);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedCommentId) {
      onDeleteComment(selectedCommentId);
    }
    handleMenuClose();
  };

  // Format date as relative time (e.g., "2 hours ago", "13 min ago")
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    // Backend stores timestamps in UTC - ensure proper parsing
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

    if (diffMins < 0) return 'just now';
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const canEditComment = (comment) => {
    return comment.author_id === currentUserId || isSuperAdmin;
  };

  const canDeleteComment = (comment) => {
    return comment.author_id === currentUserId || isSuperAdmin;
  };

  // Get avatar color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#9CA3AF';
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Box>
      {/* Comments List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, mb: 3 }}>
        {comments.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ color: '#9CA3AF', textAlign: 'center', py: 4 }}
          >
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          comments.map((comment, index) => (
            <Box
              key={comment.id}
              sx={{
                display: 'flex',
                gap: 2,
                py: 2,
                borderBottom: index < comments.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              {/* Author Avatar */}
              <Avatar
                src={comment.author_avatar}
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: '0.875rem',
                  bgcolor: getAvatarColor(comment.author_name),
                }}
              >
                {comment.author_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>

              {/* Comment Content */}
              <Box sx={{ flex: 1 }}>
                {/* Header - Name and Time */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}
                  >
                    {comment.author_name || 'Unknown'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#9CA3AF', fontSize: '0.75rem' }}
                  >
                    {formatRelativeTime(comment.created_at)}
                  </Typography>
                  {comment.visibility === 'internal' && (
                    <Chip
                      size="small"
                      icon={<Lock size={10} />}
                      label="Internal"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        '& .MuiChip-icon': {
                          marginLeft: '4px',
                          color: '#92400E',
                        },
                      }}
                    />
                  )}
                </Box>

                {/* Body */}
                {editingCommentId === comment.id ? (
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleEditSubmit(comment.id)}
                        sx={{
                          textTransform: 'none',
                          borderRadius: '6px',
                          backgroundColor: '#2563EB',
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setEditingCommentId(null)}
                        sx={{
                          textTransform: 'none',
                          borderRadius: '6px',
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: '#4B5563', lineHeight: 1.5 }}
                  >
                    {comment.body || comment.content}
                  </Typography>
                )}
              </Box>

              {/* Actions Menu */}
              {(canEditComment(comment) || canDeleteComment(comment)) && (
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, comment.id)}
                  sx={{ alignSelf: 'flex-start', opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                  <MoreVertical size={16} color="#6B7280" />
                </IconButton>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Comment Input - at bottom with avatar */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.875rem',
            bgcolor: '#9CA3AF',
          }}
        >
          U
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading}
            size="small"
            sx={{
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
                  borderColor: '#2563EB',
                },
              },
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || isLoading}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            px: 3,
            '&:hover': {
              backgroundColor: '#1D4ED8',
            },
          }}
        >
          Comment
        </Button>
      </Box>

      {/* Internal Comment Toggle (Super Admin only) */}
      {isSuperAdmin && (
        <Box sx={{ mt: 1, ml: 6.5 }}>
          <Button
            size="small"
            variant={isInternal ? 'contained' : 'text'}
            onClick={() => setIsInternal(!isInternal)}
            startIcon={<Lock size={12} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              ...(isInternal
                ? {
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    '&:hover': {
                      backgroundColor: '#FDE68A',
                    },
                  }
                : {
                    color: '#6B7280',
                  }),
            }}
          >
            {isInternal ? 'Internal Note' : 'Make Internal'}
          </Button>
        </Box>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            const comment = comments.find((c) => c.id === selectedCommentId);
            if (comment) handleStartEdit(comment);
          }}
        >
          <Edit2 size={14} style={{ marginRight: 8 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: '#DC2626' }}>
          <Trash2 size={14} style={{ marginRight: 8 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CommentThread;
