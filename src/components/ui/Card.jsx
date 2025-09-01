import React from 'react';

const Card = ({ 
  children, 
  title, 
  subtitle,
  className = '',
  padding = 'normal',
  shadow = 'normal',
  ...props 
}) => {
  const getPaddingClasses = () => {
    const paddings = {
      none: '',
      small: 'p-4',
      normal: 'p-6',
      large: 'p-8',
    };
    return paddings[padding] || paddings.normal;
  };

  const getShadowClasses = () => {
    const shadows = {
      none: '',
      small: 'shadow-sm',
      normal: 'shadow-md',
      large: 'shadow-lg',
    };
    return shadows[shadow] || shadows.normal;
  };

  return (
    <div 
      className={`
        bg-white rounded-lg border border-gray-200
        ${getShadowClasses()}
        ${getPaddingClasses()}
        ${className}
      `}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
