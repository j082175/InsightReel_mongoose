import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import AnimatedButton from './AnimatedButton';

const meta: Meta<typeof AnimatedButton> = {
  title: 'Shared/Components/AnimatedButton',
  component: AnimatedButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**AnimatedButton**은 마우스 호버와 클릭 시 부드러운 애니메이션 효과를 제공하는 버튼 컴포넌트입니다.

### 주요 기능
- 🎭 Framer Motion 기반 부드러운 애니메이션
- 🎨 다양한 variant 스타일 지원
- 🔄 로딩 상태 지원
- ♿ 접근성 최적화 (disabled 상태 처리)
- 📱 반응형 디자인

### 애니메이션 효과
- **Hover**: 약간의 크기 확대 (scale: 1.05)
- **Tap**: 클릭 시 살짝 축소 (scale: 0.95)
- **Transition**: 0.2초 부드러운 전환

### 사용 사례
- 주요 액션 버튼 (저장, 삭제, 실행)
- 폼 제출 버튼
- 모달 액션 버튼
- 네비게이션 버튼
        `,
      },
    },
  },
  argTypes: {
    variant: {
      description: '버튼 스타일 variant',
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'success', 'warning'],
    },
    size: {
      description: '버튼 크기',
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      description: '비활성화 상태',
      control: { type: 'boolean' },
    },
    loading: {
      description: '로딩 상태',
      control: { type: 'boolean' },
    },
    children: {
      description: '버튼 내용',
      control: { type: 'text' },
    },
    onClick: {
      description: '클릭 이벤트 핸들러',
      action: 'clicked',
    },
  },
  args: {
    onClick: fn(),
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
  parameters: {
    docs: {
      description: {
        story: '기본 Primary 버튼입니다. 주요 액션에 사용됩니다.',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
  parameters: {
    docs: {
      description: {
        story: 'Secondary 버튼입니다. 보조 액션에 사용됩니다.',
      },
    },
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
  parameters: {
    docs: {
      description: {
        story: 'Danger 버튼입니다. 삭제, 경고 등의 위험한 액션에 사용됩니다.',
      },
    },
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Save',
  },
  parameters: {
    docs: {
      description: {
        story: 'Success 버튼입니다. 저장, 완료 등의 성공 액션에 사용됩니다.',
      },
    },
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
  parameters: {
    docs: {
      description: {
        story: 'Warning 버튼입니다. 주의가 필요한 액션에 사용됩니다.',
      },
    },
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small Button',
  },
  parameters: {
    docs: {
      description: {
        story: '작은 크기의 버튼입니다. 제한된 공간에서 사용됩니다.',
      },
    },
  },
};

export const Medium: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Medium Button',
  },
  parameters: {
    docs: {
      description: {
        story: '중간 크기의 버튼입니다. 기본 크기입니다.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large Button',
  },
  parameters: {
    docs: {
      description: {
        story: '큰 크기의 버튼입니다. 중요한 액션에 사용됩니다.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
  parameters: {
    docs: {
      description: {
        story: '비활성화된 버튼입니다. 클릭할 수 없으며 애니메이션도 동작하지 않습니다.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...',
  },
  parameters: {
    docs: {
      description: {
        story: '로딩 상태의 버튼입니다. 비동기 작업 진행 중에 사용됩니다.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    children: '📊 분석 시작',
  },
  parameters: {
    docs: {
      description: {
        story: '아이콘이 포함된 버튼입니다. 텍스트와 아이콘을 함께 사용할 수 있습니다.',
      },
    },
  },
};

export const LongText: Story = {
  args: {
    variant: 'secondary',
    children: '매우 긴 텍스트가 포함된 버튼 예시입니다',
  },
  parameters: {
    docs: {
      description: {
        story: '긴 텍스트가 포함된 버튼입니다. 텍스트 길이에 따라 버튼 크기가 조정됩니다.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    variant: 'primary',
    children: '클릭해보세요!',
  },
  parameters: {
    docs: {
      description: {
        story: '애니메이션 효과를 확인할 수 있는 인터랙티브 데모입니다. 마우스를 올리거나 클릭해보세요.',
      },
    },
  },
};