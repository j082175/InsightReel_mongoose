import React, { useState, useEffect, useCallback, ReactNode } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  showFooter?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  customBackdrop?: boolean;
  customContainer?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnEsc = true,
  closeOnBackdrop = true,
  showFooter = false,
  children,
  footer,
  className = '',
  customBackdrop = false,
  customContainer = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc) {
        handleClose();
      }
    };

    if (isOpen && closeOnEsc) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEsc, handleClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (customContainer) {
    return (
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
          customBackdrop
            ? ''
            : isAnimating
              ? 'bg-black bg-opacity-50'
              : 'bg-black bg-opacity-0'
        }`}
        onClick={handleBackdropClick}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isAnimating ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full transition-all duration-200 ease-in-out ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && <div>{title}</div>}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {children}
        </div>

        {/* Footer */}
        {showFooter && footer && (
          <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
