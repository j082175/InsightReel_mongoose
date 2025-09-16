import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedListProps {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  direction?: 'horizontal' | 'vertical';
}

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const itemVariantsHorizontal = {
  hidden: {
    opacity: 0,
    x: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className = '',
  itemClassName = '',
  staggerDelay = 0.1,
  direction = 'vertical',
}) => {
  const variants =
    direction === 'horizontal' ? itemVariantsHorizontal : itemVariants;

  const containerVariantsCustom = {
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariantsCustom}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {React.Children.map(children, (child, index) => (
          <motion.div
            key={index}
            className={itemClassName}
            variants={variants}
            layout
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            whileTap={{
              scale: 0.98,
              transition: { duration: 0.1 },
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnimatedList;
