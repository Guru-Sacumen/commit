/**
 * Comment Service - API calls for ticket comment operations.
 * 
 * Provides methods for comment CRUD operations with visibility control.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

export const commentService = {
  /**
   * Get comments for a ticket.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @returns {Promise<Object>} Paginated comment list
   */
  getComments: async (ticketId, params = {}) => {
    const response = await apiClient.get(`support/tickets/${ticketId}/comments`, { params });
    return response.data;
  },

  /**
   * Add a comment to a ticket.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {Object} commentData - Comment data
   * @param {string} commentData.body - Comment content
   * @param {string} commentData.visibility - 'internal' or 'user'
   * @returns {Promise<Object>} Created comment
   */
  addComment: async (ticketId, commentData) => {
    const response = await apiClient.post(`support/tickets/${ticketId}/comments`, commentData);
    return response.data;
  },

  /**
   * Update a comment.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} commentId - Comment ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated comment
   */
  updateComment: async (ticketId, commentId, updateData) => {
    const response = await apiClient.patch(`support/tickets/${ticketId}/comments/${commentId}`, updateData);
    return response.data;
  },

  /**
   * Delete a comment (soft delete).
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteComment: async (ticketId, commentId) => {
    const response = await apiClient.delete(`support/tickets/${ticketId}/comments/${commentId}`);
    return response.data;
  },
};

export default commentService;
