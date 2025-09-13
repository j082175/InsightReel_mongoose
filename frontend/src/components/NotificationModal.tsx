import React from 'react';
import BaseModal from './BaseModal';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: number; // milliseconds
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  autoClose
}) => {
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-600" />;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnEsc={true}
      closeOnBackdrop={true}
    >
      <div className="p-6 text-center">
        {/* 아이콘 */}
        <div className={`flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full ${getColorClass()}`}>
          {getIcon()}
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        {/* 메시지 */}
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>

        {/* 확인 버튼 */}
        <button
          onClick={onClose}
          className={`px-6 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getButtonClass()}`}
        >
          확인
        </button>
      </div>
    </BaseModal>
  );
};

export default NotificationModal;