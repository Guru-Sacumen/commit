/**
 * Ticket Service - API calls for ticket management.
 * 
 * Provides methods for ticket CRUD operations, status updates,
 * and ticket-related queries.
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

export const ticketService = {
  /**
   * Get all tickets with optional filters.
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.priority - Filter by priority
   * @param {string} params.assigned_to - Filter by assignee ID
   * @param {string} params.created_by - Filter by creator ID
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @returns {Promise<Object>} Paginated ticket list
   */
  getTickets: async (params = {}) => {
    const response = await apiClient.get('support/tickets', { params });
    return response.data;
  },

  /**
   * Get a single ticket by ID.
   * 
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Ticket details
   */
  getTicket: async (ticketId) => {
    const response = await apiClient.get(`support/tickets/${ticketId}`);
    return response.data;
  },

  /**
   * Create a new ticket (manual creation).
   * 
   * @param {Object} ticketData - Ticket data
   * @param {string} ticketData.title - Ticket title (max 200 chars)
   * @param {string} ticketData.description - Ticket description
   * @param {string} ticketData.priority - Priority (Low, Medium, High, Critical)
   * @returns {Promise<Object>} Created ticket or duplicate info
   */
  createTicket: async (ticketData) => {
    const response = await apiClient.post('support/tickets', ticketData);
    return response.data;
  },

  /**
   * Create a ticket from a module (automatic creation).
   * 
   * @param {Object} ticketData - Ticket data with module reference
   * @param {Object} ticketData.module_reference - Module reference object
   * @returns {Promise<Object>} Created ticket or duplicate info
   */
  createTicketFromModule: async (ticketData) => {
    const response = await apiClient.post('support/tickets/from-module', ticketData);
    return response.data;
  },

  /**
   * Update a ticket.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated ticket
   */
  updateTicket: async (ticketId, updateData) => {
    const response = await apiClient.patch(`support/tickets/${ticketId}`, updateData);
    return response.data;
  },

  /**
   * Assign a ticket to a user (Super Admin only).
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} assigneeId - User ID to assign
   * @returns {Promise<Object>} Updated ticket
   */
  assignTicket: async (ticketId, assigneeId) => {
    const response = await apiClient.post(`support/tickets/${ticketId}/assign?assignee_id=${assigneeId}`);
    return response.data;
  },

  /**
   * Change ticket status (Super Admin only).
   * 
   * @param {string} ticketId - Ticket ID
   * @param {string} newStatus - New status value
   * @returns {Promise<Object>} Updated ticket
   */
  changeStatus: async (ticketId, newStatus) => {
    const response = await apiClient.post(`support/tickets/${ticketId}/status?new_status=${encodeURIComponent(newStatus)}`);
    return response.data;
  },

  /**
   * Reopen a closed ticket (Super Admin only).
   * 
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Reopened ticket
   */
  reopenTicket: async (ticketId) => {
    const response = await apiClient.post(`support/tickets/${ticketId}/reopen`);
    return response.data;
  },

  /**
   * Delete a ticket (Super Admin only).
   * 
   * @param {string} ticketId - Ticket ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteTicket: async (ticketId) => {
    const response = await apiClient.delete(`support/tickets/${ticketId}`);
    return response.data;
  },

  /**
   * Preview a ticket before creation.
   * 
   * @param {Object} ticketData - Ticket data to preview
   * @returns {Promise<Object>} Preview data with validation
   */
  previewTicket: async (ticketData) => {
    const response = await apiClient.post('support/tickets/preview', ticketData);
    return response.data;
  },

  /**
   * Get ticket statistics.
   * 
   * @returns {Promise<Object>} Ticket statistics
   */
  getStats: async () => {
    const response = await apiClient.get('support/stats');
    return response.data;
  },

  /**
   * Get list of assignable users (Super Admin only).
   * 
   * @returns {Promise<Array>} List of users who can be assigned to tickets
   */
  getAssignees: async () => {
    const response = await apiClient.get('support/assignees');
    return response.data;
  },
};

export default ticketService;
