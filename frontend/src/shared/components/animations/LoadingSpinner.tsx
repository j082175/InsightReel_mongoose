import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3B82F6',
  className = '',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-4 rounded-full`}
        style={{ borderTopColor: color }}
        variants={spinVariants}
        animate="animate"
      />
      {text && (
        <motion.p
          className="mt-3 text-sm text-gray-600"
          variants={pulseVariants}
          animate="animate"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;
