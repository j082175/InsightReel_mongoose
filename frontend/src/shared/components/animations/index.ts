// 애니메이션 컴포넌트 통합 export
export { default as AnimatedModal } from './AnimatedModal';
export { default as AnimatedList } from './AnimatedList';
export { default as FadeIn } from './FadeIn';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as AnimatedButton } from './AnimatedButton';

// 공통 애니메이션 variants
export const commonVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
};

// 공통 transition 설정
export const commonTransitions = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 25,
  },
  ease: {
    duration: 0.3,
    ease: 'easeOut',
  },
  smooth: {
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1],
  },
};
