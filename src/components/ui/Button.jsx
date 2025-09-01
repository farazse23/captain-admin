import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  icon, 
  iconPosition = 'left',
  loading = false, 
  disabled = false, 
  onClick, 
  className = '',
  type = 'button',
  ...props 
}) => {
  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      secondary: 'bg-white hover:bg-gray-50 text-blue-600 border-blue-600 border',
      outline: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 border',
      success: 'bg-green-500 hover:bg-green-600 text-white border-green-500',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500',
      danger: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
    };
    return variants[variant] || variants.primary;
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-sm',
      large: 'px-6 py-3 text-base',
    };
    return sizes[size] || sizes.medium;
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <FontAwesomeIcon icon={['fas', 'spinner']} spin className="mr-2" />
      ) : (
        icon && iconPosition === 'left' && (
          <FontAwesomeIcon icon={icon} className="mr-2" />
        )
      )}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' && (
        <FontAwesomeIcon icon={icon} className="ml-2" />
      )}
    </button>
  );
};

export default Button;
