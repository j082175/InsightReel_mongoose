import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    // 컨트롤 설정
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },

    // 접근성 테스트 설정
    a11y: {
      test: 'todo',
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-management',
            enabled: true,
          },
        ],
      },
    },

    // 배경 설정
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'gray',
          value: '#f5f5f5',
        },
      ],
    },

    // 액션 로깅 설정 (visual test addon 호환성을 위해 간소화)
    actions: {},

    // 문서 설정
    docs: {
      toc: true,
      page: () => {
        return (
          <div>
            <h1>InsightReel Component Library</h1>
            <p>YouTube, Instagram, TikTok 비디오 분석 도구의 컴포넌트 라이브러리</p>
          </div>
        );
      },
    },

    // 뷰포트 설정 (기본 옵션)
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1024px', height: '768px' },
        },
      },
    },

    // 레이아웃 설정
    layout: 'centered',
  },

  // 글로벌 타입 설정
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
