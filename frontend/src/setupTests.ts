import '@testing-library/jest-dom';

// 전역 테스트 설정

// ResizeObserver 모킹 (Framer Motion에서 사용)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// IntersectionObserver 모킹
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// matchMedia 모킹 (CSS media queries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// scrollTo 모킹
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// fetch 모킹 (기본적인 모킹, 필요에 따라 개별 테스트에서 override)
global.fetch = jest.fn();

// console 에러 무시 (개발 중 불필요한 에러 메시지 숨김)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
