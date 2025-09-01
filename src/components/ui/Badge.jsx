import React from 'react';
import { STATUS_COLORS } from '../../utils/constants';

const Badge = ({ 
  children, 
  variant = 'default', 
  status,
  size = 'medium',
  className = '',
  customColors,
  ...domProps 
}) => {
  const getStatusColor = () => {
    if (status && customColors && customColors[status]) {
      return customColors[status];
    }
    if (status && STATUS_COLORS[status]) {
      return STATUS_COLORS[status];
    }
    return STATUS_COLORS.active;
  };

  const getVariantClasses = () => {
    if (status) {
      const color = getStatusColor();
      return {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      };
    }

    const variants = {
      default: 'bg-gray-100 text-gray-800 border-gray-200',
      primary: 'bg-blue-100 text-blue-800 border-blue-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return variants[variant] || variants.default;
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'px-2 py-0.5 text-xs',
      medium: 'px-2.5 py-1 text-sm',
      large: 'px-3 py-1.5 text-base',
    };
    return sizes[size] || sizes.medium;
  };

  const formatStatus = (status) => {
    if (!status) return children;
    return status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  const badgeStyle = status ? { 
    backgroundColor: `${getStatusColor()}20`, 
    color: getStatusColor(),
    borderColor: `${getStatusColor()}40`,
  } : {};

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${status ? '' : getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      style={badgeStyle}
      {...domProps}
    >
      {status ? formatStatus(status) : children}
    </span>
  );
};

export default Badge;
