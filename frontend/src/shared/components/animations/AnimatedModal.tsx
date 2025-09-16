import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../Modal';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showFooter?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: -50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -50,
    transition: {
      duration: 0.2,
      ease: 'easeInOut' as const,
    },
  },
};

const overlayVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

const AnimatedModal: React.FC<AnimatedModalProps> = (props) => {
  return (
    <AnimatePresence mode="wait">
      {props.isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={props.onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className={`bg-white rounded-lg shadow-xl w-full ${
                props.size === 'sm'
                  ? 'max-w-sm'
                  : props.size === 'md'
                    ? 'max-w-md'
                    : props.size === 'lg'
                      ? 'max-w-lg'
                      : props.size === 'xl'
                        ? 'max-w-xl'
                        : props.size === '2xl'
                          ? 'max-w-2xl'
                          : 'max-w-md'
              } ${props.className || ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {props.title && (
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {typeof props.title === 'string' ? (
                        <h2 className="text-lg font-semibold text-gray-900">
                          {props.title}
                        </h2>
                      ) : (
                        props.title
                      )}
                    </div>
                    <button
                      onClick={props.onClose}
                      className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
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
                  </div>
                </div>
              )}

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {props.children}
              </motion.div>

              {/* Footer */}
              {props.showFooter && props.footer && (
                <motion.div
                  className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {props.footer}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AnimatedModal;
