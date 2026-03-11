import React from 'react';
import { clsx } from '@utils/helpers';

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-85 z-50 flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={clsx(
          'bg-bg-dark-card border border-border-dark rounded-xl w-full p-10 relative shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-text-dark-muted hover:text-white transition-colors hover:rotate-90"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        
        {title && (
          <h2 className="text-2xl font-bold mb-6 text-white">{title}</h2>
        )}
        
        {children}
      </div>
    </div>
  );
};
