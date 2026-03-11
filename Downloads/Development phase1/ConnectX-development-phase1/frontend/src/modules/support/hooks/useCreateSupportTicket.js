import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';

/**
 * useCreateSupportTicket - Hook for creating support tickets from other modules.
 * 
 * Provides a reusable way to create support tickets with module context.
 * Handles loading state, error handling, and navigation.
 * 
 * @returns {Object} Hook state and methods
 */
const useCreateSupportTicket = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a support ticket from a module.
   * 
   * @param {Object} params - Ticket parameters
   * @param {string} params.module - Source module (integration_library, lab, automated_testing, agentic_monitor)
   * @param {string} params.resourceType - Type of resource
   * @param {string} params.resourceId - ID of the resource
   * @param {string} params.resourceName - Name of the resource
   * @param {string} params.title - Optional custom title
   * @param {string} params.description - Optional custom description
   * @param {string} params.priority - Optional priority (defaults based on module)
   * @param {Object} params.context - Additional context data
   * @returns {Promise<Object>} Created ticket or duplicate info
   */
  const createTicket = useCallback(async ({
    module,
    resourceType,
    resourceId,
    resourceName,
    title,
    description,
    priority,
    context = {},
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const moduleReference = {
        module,
        resource_type: resourceType,
        resource_id: resourceId,
      };

      const autoTitle = title || generateAutoTitle(module, resourceType, resourceName);
      const autoDescription = description || generateAutoDescription(module, resourceType, resourceName, resourceId, context);
      const autoPriority = priority || determinePriority(module, context);

      const response = await ticketService.createTicketFromModule({
        title: autoTitle,
        description: autoDescription,
        priority: autoPriority,
        module_reference: moduleReference,
      });

      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create support ticket';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create ticket and navigate to it.
   */
  const createAndNavigate = useCallback(async (params) => {
    const response = await createTicket(params);
    
    if (response.is_duplicate && response.existing_ticket_id) {
      navigate(`/support/tickets/${response.existing_ticket_id}`);
    } else if (response.ticket) {
      navigate(`/support/tickets/${response.ticket.id}`);
    }
    
    return response;
  }, [createTicket, navigate]);

  return {
    createTicket,
    createAndNavigate,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};

function generateAutoTitle(module, resourceType, resourceName) {
  const moduleTitles = {
    integration_library: `Connector Issue: ${resourceName}`,
    lab: `Sandbox Request: ${resourceName}`,
    automated_testing: `Test Failure: ${resourceName}`,
    agentic_monitor: `Endpoint Alert: ${resourceName}`,
  };
  return moduleTitles[module] || `Support Request: ${resourceName}`;
}

function generateAutoDescription(module, resourceType, resourceName, resourceId, context) {
  const descriptions = {
    integration_library: `Issue reported for connector "${resourceName}".\n\nResource Type: ${resourceType}\nResource ID: ${resourceId}`,
    lab: `Sandbox request for "${resourceName}".\n\nResource Type: ${resourceType}\nResource ID: ${resourceId}`,
    automated_testing: `Test failure detected for "${resourceName}".\n\nResource Type: ${resourceType}\nResource ID: ${resourceId}`,
    agentic_monitor: `Endpoint failure alert for "${resourceName}".\n\nResource Type: ${resourceType}\nResource ID: ${resourceId}`,
  };
  
  let description = descriptions[module] || `Support request for "${resourceName}".`;
  
  if (context.error_message) {
    description += `\n\nError: ${context.error_message}`;
  }
  if (context.additional_info) {
    description += `\n\nAdditional Info: ${context.additional_info}`;
  }
  
  return description;
}

function determinePriority(module, context) {
  if (context.severity === 'critical' || context.is_critical) {
    return 'Critical';
  }
  if (module === 'agentic_monitor' || module === 'automated_testing') {
    return 'High';
  }
  return 'Medium';
}

export default useCreateSupportTicket;
