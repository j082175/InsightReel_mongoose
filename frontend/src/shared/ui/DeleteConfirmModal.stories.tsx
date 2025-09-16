import type { Meta, StoryObj } from '@storybook/react';
import DeleteConfirmModal from './DeleteConfirmModal';

const meta: Meta<typeof DeleteConfirmModal> = {
  title: 'Shared/UI/DeleteConfirmModal',
  component: DeleteConfirmModal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**DeleteConfirmModal**은 삭제 작업에 특화된 확인 모달 컴포넌트입니다.

### 주요 기능
- ⚠️ 위험한 삭제 작업에 대한 명확한 경고
- 🎨 빨간색 기반 위험 시각 표시
- 📝 삭제할 항목명 표시로 명확성 증대
- 🔒 실수 방지를 위한 이중 확인
- ♿ 접근성 최적화 (ARIA 레이블)

### 디자인 원칙
- **명확성**: 무엇을 삭제하는지 명확히 표시
- **안전성**: 실수 삭제 방지를 위한 확인 프로세스
- **일관성**: 모든 삭제 작업에서 동일한 UX

### 사용 사례
- 비디오 삭제 확인
- 채널 삭제 확인
- 배치 삭제 확인
- 채널 그룹 삭제 확인
- 트렌딩 비디오 삭제 확인
        `,
      },
    },
  },
  argTypes: {
    isOpen: {
      description: '모달 열림 상태',
      control: { type: 'boolean' },
    },
    onClose: {
      description: '모달 닫기 핸들러',
      action: 'modal-closed',
    },
    onConfirm: {
      description: '삭제 확인 핸들러',
      action: 'delete-confirmed',
    },
    title: {
      description: '삭제할 항목의 제목/이름',
      control: { type: 'text' },
    },
    type: {
      description: '삭제할 항목의 타입',
      control: { type: 'text' },
    },
    isLoading: {
      description: '삭제 처리 중 로딩 상태',
      control: { type: 'boolean' },
    },
  },
  args: {
    onClose: () => console.log('Action triggered'),
    onConfirm: () => console.log('Action triggered'),
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    isOpen: false,
    title: '테스트 비디오',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '닫힌 상태의 삭제 확인 모달입니다.',
      },
    },
  },
};

export const VideoDelete: Story = {
  args: {
    isOpen: true,
    title: 'YouTube 마케팅 전략 완벽 가이드',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '비디오 삭제 확인 모달입니다. 긴 제목의 비디오 삭제 시나리오입니다.',
      },
    },
  },
};

export const ChannelDelete: Story = {
  args: {
    isOpen: true,
    title: '테크 리뷰 채널',
    type: '채널',
  },
  parameters: {
    docs: {
      description: {
        story: '채널 삭제 확인 모달입니다. 채널 삭제 시나리오입니다.',
      },
    },
  },
};

export const BatchDelete: Story = {
  args: {
    isOpen: true,
    title: '2024년 1월 수집 배치',
    type: '배치',
  },
  parameters: {
    docs: {
      description: {
        story: '배치 삭제 확인 모달입니다. 수집 배치 삭제 시나리오입니다.',
      },
    },
  },
};

export const ChannelGroupDelete: Story = {
  args: {
    isOpen: true,
    title: '엔터테인먼트 채널 그룹',
    type: '채널 그룹',
  },
  parameters: {
    docs: {
      description: {
        story: '채널 그룹 삭제 확인 모달입니다. 채널 그룹 삭제 시나리오입니다.',
      },
    },
  },
};

export const TrendingVideoDelete: Story = {
  args: {
    isOpen: true,
    title: '🔥 바이럴 숏폼 콘텐츠 제작법',
    type: '트렌딩 비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '트렌딩 비디오 삭제 확인 모달입니다. 이모지가 포함된 제목 처리를 확인할 수 있습니다.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    isOpen: true,
    title: '삭제 처리 중인 항목',
    type: '비디오',
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: '삭제 처리 중인 상태의 모달입니다. 로딩 스피너와 비활성화된 버튼을 확인할 수 있습니다.',
      },
    },
  },
};

export const LongTitle: Story = {
  args: {
    isOpen: true,
    title: '매우 긴 제목을 가진 비디오입니다 - 이런 경우 제목이 어떻게 표시되는지 확인해보세요',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '매우 긴 제목의 항목 삭제 확인 모달입니다. 긴 제목 처리를 확인할 수 있습니다.',
      },
    },
  },
};

export const SpecialCharacters: Story = {
  args: {
    isOpen: true,
    title: '[특수문자] & 기호가 포함된 @#$% 비디오 제목!',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '특수문자가 포함된 제목의 삭제 확인 모달입니다. 특수문자 렌더링을 확인할 수 있습니다.',
      },
    },
  },
};

export const KoreanTitle: Story = {
  args: {
    isOpen: true,
    title: '한국어 콘텐츠 제목 예시',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '한국어 제목의 삭제 확인 모달입니다. 한글 타이포그래피를 확인할 수 있습니다.',
      },
    },
  },
};

export const EnglishTitle: Story = {
  args: {
    isOpen: true,
    title: 'Complete Guide to React Development',
    type: 'video',
  },
  parameters: {
    docs: {
      description: {
        story: '영어 제목의 삭제 확인 모달입니다. 영문 타이포그래피를 확인할 수 있습니다.',
      },
    },
  },
};

export const MixedLanguage: Story = {
  args: {
    isOpen: true,
    title: 'React 개발자를 위한 Complete Guide to TypeScript',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '한영 혼합 제목의 삭제 확인 모달입니다. 다국어 제목 처리를 확인할 수 있습니다.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    isOpen: true,
    title: '인터랙티브 데모 비디오',
    type: '비디오',
  },
  parameters: {
    docs: {
      description: {
        story: '인터랙티브 데모입니다. 실제로 버튼을 클릭해서 삭제 확인 플로우를 체험해보세요.',
      },
    },
  },
};