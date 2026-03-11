import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  LinearProgress,
  Tooltip,
  Button,
} from '@mui/material';
import {
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';

/**
 * FileAttachmentList - File attachment display and upload component.
 * 
 * Features:
 * - File cards with download/delete actions
 * - Upload with progress indicator
 * - File type icons
 * - Size display
 * 
 * @param {Object} props - Component props
 * @param {Array} props.attachments - List of attachments
 * @param {Function} props.onUpload - Upload handler
 * @param {Function} props.onDownload - Download handler
 * @param {Function} props.onDelete - Delete handler
 * @param {boolean} props.canUpload - Whether user can upload
 * @param {boolean} props.canDelete - Whether user can delete
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} File attachment list component
 */
const FileAttachmentList = ({
  attachments = [],
  onUpload,
  onDownload,
  onDelete,
  canUpload = true,
  canDelete = false,
  isLoading = false,
}) => {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
  ];

  const getFileIcon = (mimeType, filename) => {
    if (mimeType?.startsWith('image/')) {
      return <Image size={20} color="#6366F1" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText size={20} color="#DC2626" />;
    }
    if (mimeType?.includes('word') || filename?.endsWith('.doc') || filename?.endsWith('.docx')) {
      return <FileText size={20} color="#2563EB" />;
    }
    if (mimeType?.includes('excel') || filename?.endsWith('.xls') || filename?.endsWith('.xlsx')) {
      return <FileText size={20} color="#059669" />;
    }
    return <File size={20} color="#6B7280" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }
    return { valid: true, error: null };
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    try {
      await onUpload(file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(null);
    } catch (error) {
      setUploadError(error.message || 'Upload failed');
      setUploadProgress(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    try {
      await onUpload(file, (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(null);
    } catch (error) {
      setUploadError(error.message || 'Upload failed');
      setUploadProgress(null);
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      {canUpload && (
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            border: `2px dashed ${dragOver ? '#6366F1' : '#E5E7EB'}`,
            borderRadius: '8px',
            p: 3,
            mb: 2,
            textAlign: 'center',
            backgroundColor: dragOver ? '#EEF2FF' : '#F9FAFB',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            id="file-upload"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={isLoading || uploadProgress !== null}
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
            <Upload size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 0.5 }}>
              Drag and drop a file here, or click to select
            </Typography>
            <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
              Max 10MB • Images, PDF, Word, Excel, Text, ZIP
            </Typography>
          </label>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  borderRadius: '4px',
                  backgroundColor: '#E5E7EB',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#6366F1',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#6B7280', mt: 0.5 }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}

          {/* Upload Error */}
          {uploadError && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2,
                color: '#DC2626',
              }}
            >
              <AlertCircle size={16} />
              <Typography variant="caption">{uploadError}</Typography>
              <IconButton size="small" onClick={() => setUploadError(null)}>
                <X size={14} />
              </IconButton>
            </Box>
          )}
        </Box>
      )}

      {/* Attachments List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {attachments.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ color: '#9CA3AF', textAlign: 'center', py: 2 }}
          >
            No attachments
          </Typography>
        ) : (
          attachments.map((attachment) => (
            <Card
              key={attachment.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              {/* File Icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5,
                }}
              >
                {getFileIcon(attachment.mime_type, attachment.filename)}
              </Box>

              {/* File Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attachment.filename}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                  {formatFileSize(attachment.file_size)}
                </Typography>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Download">
                  <IconButton
                    size="small"
                    onClick={() => onDownload(attachment.id)}
                    sx={{ color: '#6B7280' }}
                  >
                    <Download size={16} />
                  </IconButton>
                </Tooltip>
                {canDelete && (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(attachment.id)}
                      sx={{ color: '#DC2626' }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
};

export default FileAttachmentList;
