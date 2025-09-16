import React from 'react';
import { motion } from 'framer-motion';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 30,
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: distance };
      case 'right':
        return { opacity: 0, x: -distance };
      default:
        return { opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      default:
        return { opacity: 1 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitialPosition()}
      animate={getAnimatePosition()}
      transition={{
        duration,
        delay,
        ease: 'easeOut' as const,
      }}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
