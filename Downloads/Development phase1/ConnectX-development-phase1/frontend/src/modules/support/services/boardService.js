/**
 * Board Service - API calls for Kanban board operations.
 * 
 * Provides methods for fetching board data and handling
 * drag-and-drop status updates.
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

export const boardService = {
  /**
   * Get Kanban board data with tickets grouped by status.
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.priority - Filter by priority
   * @param {string} params.assigned_to - Filter by assignee ID
   * @param {string} params.module - Filter by source module
   * @returns {Promise<Object>} Board data with columns
   */
  getBoardData: async (params = {}) => {
    const response = await apiClient.get('support/tickets/board', { params });
    return response.data;
  },

  /**
   * Update ticket status via drag-and-drop (Super Admin only).
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} newStatus - New status value
   * @returns {Promise<Object>} Update result
   */
  updateTicketStatus: async (ticketId, newStatus) => {
    const response = await apiClient.post(`support/tickets/${ticketId}/status?new_status=${encodeURIComponent(newStatus)}`);
    return response.data;
  },
};

export default boardService;
