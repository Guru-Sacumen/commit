/**
 * Activity Service - API calls for ticket activity timeline.
 * 
 * Provides methods for fetching activity events for tickets.
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

export const activityService = {
  /**
   * Get activity timeline for a ticket.
   * 
   * @param {string} ticketId - Ticket ID
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @returns {Promise<Object>} Paginated activity events
   */
  getActivity: async (ticketId, params = {}) => {
    const response = await apiClient.get(`support/tickets/${ticketId}/activity`, { params });
    return response.data;
  },
};

export default activityService;
