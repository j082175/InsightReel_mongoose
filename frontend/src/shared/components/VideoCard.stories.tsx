import type { Meta, StoryObj } from '@storybook/react';
import VideoCard from './VideoCard';
import { mockVideo } from '../../__tests__/utils/test-utils';

const meta: Meta<typeof VideoCard> = {
  title: 'Shared/Components/VideoCard',
  component: VideoCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**VideoCard**는 비디오 정보를 표시하는 핵심 컴포넌트입니다.

### 주요 기능
- 📺 비디오 썸네일, 제목, 채널명, 조회수 표시
- 🎯 플랫폼별 스타일링 (YouTube, Instagram, TikTok)
- ✅ 선택 모드 지원 (체크박스)
- 📅 아카이브 정보 표시 옵션
- 🎭 다양한 이벤트 핸들러 지원

### 사용 사례
- 메인 대시보드의 비디오 리스트
- 배치 관리 페이지의 수집된 비디오
- 트렌딩 비디오 아카이브
- 채널 분석 모달의 비디오 목록
        `,
      },
    },
  },
  argTypes: {
    video: {
      description: '표시할 비디오 객체',
      control: { type: 'object' },
    },
    onClick: {
      description: '카드 클릭 시 호출되는 핸들러',
      action: 'clicked',
    },
    onInfoClick: {
      description: '정보 버튼 클릭 시 호출되는 핸들러',
      action: 'info-clicked',
    },
    onDelete: {
      description: '삭제 버튼 클릭 시 호출되는 핸들러',
      action: 'deleted',
    },
    onChannelClick: {
      description: '채널명 클릭 시 호출되는 핸들러',
      action: 'channel-clicked',
    },
    onSelectToggle: {
      description: '선택 토글 시 호출되는 핸들러',
      action: 'select-toggled',
    },
    isSelectMode: {
      description: '선택 모드 활성화 여부',
      control: { type: 'boolean' },
    },
    isSelected: {
      description: '선택 상태 여부',
      control: { type: 'boolean' },
    },
    showArchiveInfo: {
      description: '아카이브 정보 표시 여부',
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    video: mockVideo,
    onDelete: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: '기본 VideoCard 상태입니다. 삭제 버튼 없이 비디오 정보만 표시됩니다.',
      },
    },
  },
};

export const WithAllActions: Story = {
  args: {
    video: mockVideo,
  },
  parameters: {
    docs: {
      description: {
        story: '모든 액션 버튼이 포함된 VideoCard입니다. 정보 보기, 삭제 등 모든 기능을 사용할 수 있습니다.',
      },
    },
  },
};

export const SelectMode: Story = {
  args: {
    video: mockVideo,
    isSelectMode: true,
    isSelected: false,
  },
  parameters: {
    docs: {
      description: {
        story: '선택 모드가 활성화된 VideoCard입니다. 체크박스가 표시되며 클릭으로 선택할 수 있습니다.',
      },
    },
  },
};

export const Selected: Story = {
  args: {
    video: mockVideo,
    isSelectMode: true,
    isSelected: true,
  },
  parameters: {
    docs: {
      description: {
        story: '선택된 상태의 VideoCard입니다. 체크박스가 체크되어 있습니다.',
      },
    },
  },
};

export const WithArchiveInfo: Story = {
  args: {
    video: {
      ...mockVideo,
      collectedAt: '2024-01-15T12:00:00Z',
    },
    showArchiveInfo: true,
  },
  parameters: {
    docs: {
      description: {
        story: '아카이브 정보가 포함된 VideoCard입니다. 수집 날짜가 추가로 표시됩니다.',
      },
    },
  },
};

export const InstagramVideo: Story = {
  args: {
    video: {
      ...mockVideo,
      platform: 'INSTAGRAM',
      title: 'Instagram 릴스 영상',
      channelName: '@instagram_channel',
      views: 500000,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Instagram 플랫폼 비디오의 VideoCard입니다. 플랫폼별 스타일링이 적용됩니다.',
      },
    },
  },
};

export const TikTokVideo: Story = {
  args: {
    video: {
      ...mockVideo,
      platform: 'TIKTOK',
      title: '바이럴 TikTok 댄스 영상',
      channelName: '@tiktok_user',
      views: 2000000,
      duration: 'SHORT',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'TikTok 플랫폼 비디오의 VideoCard입니다. 숏폼 콘텐츠에 최적화된 표시입니다.',
      },
    },
  },
};

export const LongFormVideo: Story = {
  args: {
    video: {
      ...mockVideo,
      duration: 'LONG',
      title: '긴 형태의 교육 콘텐츠 - 완전한 튜토리얼',
      views: 50000,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '롱폼 비디오의 VideoCard입니다. 긴 제목과 롱폼 콘텐츠 라벨이 표시됩니다.',
      },
    },
  },
};

export const HighViewCount: Story = {
  args: {
    video: {
      ...mockVideo,
      views: 15750000,
      title: '바이럴 히트 영상 - 천만 조회수 돌파!',
      isTrending: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '높은 조회수의 VideoCard입니다. 조회수 포맷팅이 어떻게 표시되는지 확인할 수 있습니다.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    video: {
      ...mockVideo,
      thumbnailUrl: '', // 썸네일 로딩 시뮬레이션
    },
  },
  parameters: {
    docs: {
      description: {
        story: '썸네일이 로딩 중인 VideoCard 상태입니다.',
      },
    },
  },
};