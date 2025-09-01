import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Input = ({ 
  label,
  error,
  helper,
  icon,
  iconPosition = 'left',
  className = '',
  inputClassName = '',
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  ...props 
}) => {
  const hasError = !!error;
  const hasIcon = !!icon;

  const getInputClasses = () => {
    let classes = `
      block w-full rounded-md border transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${hasIcon && iconPosition === 'left' ? 'pl-10' : ''}
      ${hasIcon && iconPosition === 'right' ? 'pr-10' : ''}
    `;

    if (hasError) {
      classes += ' border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    } else {
      classes += ' border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';
    }

    return classes;
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {hasIcon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon 
              icon={icon} 
              className={hasError ? 'text-red-400' : 'text-gray-400'} 
            />
          </div>
        )}
        
        <input
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`${getInputClasses()} px-3 py-2 ${inputClassName}`}
          {...props}
        />
        
        {hasIcon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <FontAwesomeIcon 
              icon={icon} 
              className={hasError ? 'text-red-400' : 'text-gray-400'} 
            />
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      {helper && !error && (
        <p className="mt-2 text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
};

export default Input;
