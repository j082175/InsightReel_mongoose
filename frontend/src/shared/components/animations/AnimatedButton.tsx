import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400',
    secondary:
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-400',
    success:
      'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-gray-400',
  };

  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: disabled || loading ? 1 : 1.05,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: disabled || loading ? 1 : 0.95,
      transition: { duration: 0.1 },
    },
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

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      {loading && (
        <motion.div
          className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
          variants={spinVariants}
          animate="animate"
        />
      )}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: loading ? 0.7 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
};

export default AnimatedButton;
