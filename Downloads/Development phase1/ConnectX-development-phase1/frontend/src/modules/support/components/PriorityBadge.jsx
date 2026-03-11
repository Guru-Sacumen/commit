import React from 'react';
import { Chip } from '@mui/material';
import { 
  AlertCircle, 
  AlertTriangle, 
  Circle, 
  ArrowDown 
} from 'lucide-react';

/**
 * PriorityBadge - Color-coded priority indicator for tickets.
 * 
 * Priority colors per UI design:
 * - P1 Critical → Red
 * - P2 High → Orange
 * - P3 Normal/Medium → Blue
 * - P4 Low → Gray
 * 
 * @param {Object} props - Component props
 * @param {string} props.priority - Priority value (Critical, High, Medium, Low)
 * @param {string} props.size - Badge size ('small' | 'medium')
 * @param {boolean} props.showLabel - Whether to show priority label
 * @returns {JSX.Element} Priority badge component
 */
const PriorityBadge = ({ priority, size = 'small', showLabel = true }) => {
  const priorityConfig = {
    Critical: {
      color: '#DC2626',
      bgColor: '#FEE2E2',
      borderColor: '#FECACA',
      icon: AlertCircle,
      label: 'P1 Critical',
      shortLabel: 'P1',
    },
    High: {
      color: '#EA580C',
      bgColor: '#FFEDD5',
      borderColor: '#FED7AA',
      icon: AlertTriangle,
      label: 'P2 High',
      shortLabel: 'P2',
    },
    Medium: {
      color: '#2563EB',
      bgColor: '#DBEAFE',
      borderColor: '#BFDBFE',
      icon: Circle,
      label: 'P3 Normal',
      shortLabel: 'P3',
    },
    Low: {
      color: '#6B7280',
      bgColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      icon: ArrowDown,
      label: 'P4 Low',
      shortLabel: 'P4',
    },
  };

  const config = priorityConfig[priority] || priorityConfig.Medium;
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
      label={showLabel ? config.label : config.shortLabel}
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

export default PriorityBadge;
