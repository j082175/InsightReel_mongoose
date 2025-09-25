import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCookieStatus } from '../hooks/useCookieStatus';
import { SimpleCookieModal } from './SimpleCookieModal';
import { TestModal } from './TestModal';

interface CookieStatusWidgetProps {
  className?: string;
}

export const CookieStatusWidget: React.FC<CookieStatusWidgetProps> = ({
  className = ''
}) => {
  const { data: cookieStatus, isLoading, isError } = useCookieStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenCookieUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded animate-pulse mb-1"></div>
            <div className="h-3 bg-gray-300 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // 에러 또는 쿠키 없음 상태
  if (isError || !cookieStatus?.success) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors ${className}`}
        onClick={handleOpenCookieUpload}
      >
        <div className="flex items-center space-x-3">
          <div className="text-red-500 text-lg">🍪</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-red-800">
              Instagram 쿠키 없음
            </div>
            <div className="text-xs text-red-600">
              클릭하여 업로드
            </div>
          </div>
          <div className="text-red-400 text-xs">
            →
          </div>
        </div>
      </motion.div>
    );
  }

  // 정상 상태 - 만료 임박 여부에 따라 색상 결정
  const isExpiringSoon = cookieStatus.isExpiringSoon;
  const daysRemaining = cookieStatus.daysRemaining;

  const getStatusColor = () => {
    if (daysRemaining <= 0) return 'red'; // 만료됨
    if (daysRemaining <= 7) return 'orange'; // 1주일 미만
    if (daysRemaining <= 15) return 'yellow'; // 15일 미만
    return 'green'; // 양호
  };

  const getStatusIcon = () => {
    if (daysRemaining <= 0) return '❌';
    if (daysRemaining <= 7) return '🚨';
    if (daysRemaining <= 15) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (daysRemaining <= 0) return '만료됨';
    if (daysRemaining <= 7) return '긴급';
    if (daysRemaining <= 15) return '주의';
    return '양호';
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  const colorClasses = {
    green: {
      bg: 'bg-green-50 border-green-200 hover:bg-green-100',
      text: 'text-green-800',
      subtext: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      text: 'text-yellow-800',
      subtext: 'text-yellow-600'
    },
    orange: {
      bg: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      text: 'text-orange-800',
      subtext: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-50 border-red-200 hover:bg-red-100',
      text: 'text-red-800',
      subtext: 'text-red-600'
    }
  };

  const colors = colorClasses[statusColor];

  return (
    <>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${colors.bg} border rounded-lg p-4 cursor-pointer transition-colors ${className}`}
        onClick={handleOpenCookieUpload}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3">
          <div className="text-lg">{statusIcon}</div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${colors.text} flex items-center space-x-2`}>
              <span>Instagram 쿠키</span>
              <span className="text-xs px-2 py-0.5 bg-white rounded-full">
                {statusText}
              </span>
            </div>
            <div className={`text-xs ${colors.subtext}`}>
              {daysRemaining > 0 ? `${daysRemaining}일 남음` : '업데이트 필요'}
            </div>
          </div>
          <div className={`${colors.subtext} text-xs`}>
            →
          </div>
        </div>
      </motion.div>

      {/* 쿠키 업로드 모달 */}
      <SimpleCookieModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};