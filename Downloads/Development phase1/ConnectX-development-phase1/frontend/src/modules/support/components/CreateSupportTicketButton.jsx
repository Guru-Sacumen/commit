import React, { useState } from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';

/**
 * CreateSupportTicketButton - Reusable button for creating support tickets from other modules.
 * 
 * Per Session 8 requirements:
 * - Pre-fill module_reference and context
 * - Call `/tickets/from-module` endpoint
 * - Used in Integration Library, Lab, Testing, and Monitor modules
 * 
 * @param {Object} props - Component props
 * @param {string} props.module - Source module (integration_library, lab, automated_testing, agentic_monitor)
 * @param {string} props.resourceType - Type of resource (connector, sandbox, test, endpoint)
 * @param {string} props.resourceId - ID of the resource
 * @param {string} props.resourceName - Name of the resource for display
 * @param {Object} props.context - Additional context data
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {boolean} props.fullWidth - Whether button should be full width
 * @param {Function} props.onSuccess - Callback on successful ticket creation
 * @param {Function} props.onError - Callback on error
 * @returns {JSX.Element} Create support ticket button
 */
const CreateSupportTicketButton = ({
  module,
  resourceType,
  resourceId,
  resourceName,
  context = {},
  variant = 'outlined',
  size = 'small',
  fullWidth = false,
  onSuccess,
  onError,
  children,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      // Build module reference
      const moduleReference = {
        module,
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        ...context,
      };

      // Generate auto title based on module and resource
      const autoTitle = generateAutoTitle(module, resourceType, resourceName);

      // Call the from-module endpoint
      const response = await ticketService.createTicketFromModule({
        title: autoTitle,
        description: generateAutoDescription(module, resourceType, resourceName, context),
        priority: determinePriority(module, context),
        module_reference: moduleReference,
      });

      if (response.is_duplicate && response.existing_ticket_id) {
        // Navigate to existing ticket
        navigate(`/support/tickets/${response.existing_ticket_id}`);
      } else if (response.ticket) {
        // Navigate to new ticket
        navigate(`/support/tickets/${response.ticket.id}`);
      }

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      console.error('Failed to create support ticket:', err);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateAutoTitle = (module, resourceType, resourceName) => {
    const moduleTitles = {
      integration_library: `Connector Issue: ${resourceName}`,
      lab: `Sandbox Request: ${resourceName}`,
      automated_testing: `Test Failure: ${resourceName}`,
      agentic_monitor: `Endpoint Alert: ${resourceName}`,
    };
    return moduleTitles[module] || `Support Request: ${resourceName}`;
  };

  const generateAutoDescription = (module, resourceType, resourceName, context) => {
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
  };

  const determinePriority = (module, context) => {
    // Auto-determine priority based on module and context
    if (context.severity === 'critical' || context.is_critical) {
      return 'Critical';
    }
    if (module === 'agentic_monitor' || module === 'automated_testing') {
      return 'High';
    }
    return 'Medium';
  };

  const getButtonIcon = () => {
    if (isLoading) {
      return <CircularProgress size={16} color="inherit" />;
    }
    return <Headphones size={16} />;
  };

  return (
    <Tooltip title="Create a support ticket for this item" arrow>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleClick}
        disabled={isLoading}
        startIcon={getButtonIcon()}
        sx={{
          textTransform: 'none',
          borderRadius: '6px',
          ...(variant === 'outlined' && {
            borderColor: '#E5E7EB',
            color: '#374151',
            '&:hover': { 
              borderColor: '#6366F1', 
              backgroundColor: '#F5F3FF',
              color: '#6366F1',
            },
          }),
          ...(variant === 'contained' && {
            backgroundColor: '#6366F1',
            '&:hover': { backgroundColor: '#4F46E5' },
          }),
        }}
      >
        {children || 'Create Support Ticket'}
      </Button>
    </Tooltip>
  );
};

export default CreateSupportTicketButton;
