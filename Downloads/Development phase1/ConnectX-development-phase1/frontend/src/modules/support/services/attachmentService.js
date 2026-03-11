/**
 * Attachment Service - API calls for file attachment operations.
 * 
 * Provides methods for file upload, download, and deletion
 * with progress tracking.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('connectx_token') || localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const attachmentService = {
  /**
   * Get attachments for a ticket.
   * 
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Array>} List of attachments
   */
  getAttachments: async (ticketId) => {
    const response = await apiClient.get(`support/tickets/${ticketId}/attachments`);
    return response.data;
  },

  /**
   * Upload a file attachment.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Object>} Uploaded attachment info
   */
  uploadAttachment: async (ticketId, file, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
      `support/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },

  /**
   * Get download URL for an attachment.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} attachmentId - Attachment ID
   * @returns {Promise<Object>} Signed download URL
   */
  getDownloadUrl: async (ticketId, attachmentId) => {
    const response = await apiClient.get(`support/tickets/${ticketId}/attachments/${attachmentId}/download`);
    return response.data;
  },

  /**
   * Delete an attachment.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} attachmentId - Attachment ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteAttachment: async (ticketId, attachmentId) => {
    const response = await apiClient.delete(`support/tickets/${ticketId}/attachments/${attachmentId}`);
    return response.data;
  },

  /**
   * Validate file before upload.
   * 
   * @param {File} file - File to validate
   * @returns {Object} Validation result with isValid and error
   */
  validateFile: (file) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
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
      'text/x-log',
    ];

    if (file.size > MAX_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 10MB limit',
      };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'File type not allowed. Allowed: images, PDF, Word, Excel, text, zip, log files',
      };
    }

    return { isValid: true, error: null };
  },
};

export default attachmentService;
