import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  text = '', 
  variant = 'spinner',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  if (variant === 'skeleton') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-muted h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse`}
            style={{
              animationDelay: `${index * 0.15}s`,
              animationDuration: '1s'
            }}
          />
        ))}
        {text && (
          <span className={`ml-3 text-muted-foreground ${textSizeClasses[size]}`}>
            {text}
          </span>
        )}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} border-2 border-muted rounded-full`} />
        {/* Spinning ring */}
        <div 
          className={`${sizeClasses[size]} absolute top-0 left-0 border-2 border-transparent border-t-primary rounded-full animate-spin`}
          style={{ animationDuration: '1s' }}
        />
      </div>
      {text && (
        <span className={`text-muted-foreground ${textSizeClasses[size]} font-medium`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner; 