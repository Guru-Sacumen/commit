import React from 'react';
import { Chip } from '@mui/material';
import { 
  Circle, 
  PlayCircle, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

/**
 * StatusBadge - Color-coded status indicator for tickets.
 * 
 * Status colors per UI design:
 * - To Do → Gray
 * - In Progress → Blue
 * - Resolved → Green
 * - Closed → Purple
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Status value (To Do, In Progress, Resolved, Closed)
 * @param {string} props.size - Badge size ('small' | 'medium')
 * @returns {JSX.Element} Status badge component
 */
const StatusBadge = ({ status, size = 'small' }) => {
  const statusConfig = {
    'To Do': {
      color: '#6B7280',
      bgColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      icon: Circle,
    },
    'In Progress': {
      color: '#2563EB',
      bgColor: '#DBEAFE',
      borderColor: '#BFDBFE',
      icon: PlayCircle,
    },
    'Resolved': {
      color: '#059669',
      bgColor: '#D1FAE5',
      borderColor: '#A7F3D0',
      icon: CheckCircle,
    },
    'Closed': {
      color: '#7C3AED',
      bgColor: '#EDE9FE',
      borderColor: '#DDD6FE',
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || statusConfig['To Do'];
  const IconComponent = config.icon;

  return (
    <Chip
      size={size}
      icon={
        <IconComponent 
          size={size === 'small' ? 12 : 14} 
          color={config.color}
          style={{ marginLeft: 4 }}
        />
      }
      label={status}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        fontWeight: 500,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        height: size === 'small' ? 22 : 26,
        '& .MuiChip-icon': {
          marginLeft: '4px',
        },
        '& .MuiChip-label': {
          paddingLeft: '4px',
          paddingRight: '8px',
        },
      }}
    />
  );
};

export default StatusBadge;
