import React from 'react';
import { clsx } from '@utils/helpers';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick, 
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer';
  
  const variants = {
    primary: 'bg-brand-blue text-white shadow-lg hover:bg-brand-blue-dark hover:transform hover:-translate-y-0.5',
    outline: 'bg-transparent border border-border-light text-text-main hover:bg-bg-page hover:border-text-muted hover:transform hover:-translate-y-0.5',
    dark: 'bg-bg-dark-card text-white border border-border-dark hover:bg-bg-dark-page',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
