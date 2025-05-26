import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Button = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon,
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2
    active:scale-[0.98] transform
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
  `;

  const variants = {
    primary: `
      bg-primary text-primary-foreground 
      hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5
      active:bg-primary/95 active:shadow-sm active:translate-y-0
    `,
    secondary: `
      bg-secondary text-secondary-foreground border border-border
      hover:bg-secondary/80 hover:shadow-sm hover:-translate-y-0.5
      active:bg-secondary/90 active:translate-y-0
    `,
    outline: `
      border border-border bg-background text-foreground
      hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5
      active:bg-accent/80 active:translate-y-0
    `,
    ghost: `
      text-foreground
      hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5
      active:bg-accent/80 active:translate-y-0
    `,
    destructive: `
      bg-destructive text-destructive-foreground
      hover:bg-destructive/90 hover:shadow-md hover:-translate-y-0.5
      active:bg-destructive/95 active:shadow-sm active:translate-y-0
    `
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs h-6',
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12',
    xl: 'px-8 py-4 text-lg h-14'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      onClick={onClick}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <LoadingSpinner 
          size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'sm'} 
          className="mr-2"
        />
      ) : icon ? (
        <span className="mr-2 flex items-center">
          {icon}
        </span>
      ) : null}
      
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
    </button>
  );
};

export default Button; 