import type { Meta, StoryObj } from '@storybook/react';
import SearchBar from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Shared/Components/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**SearchBar**는 사용자가 텍스트를 입력하여 검색할 수 있는 공통 검색 컴포넌트입니다.

### 주요 기능
- 🔍 실시간 검색어 입력
- 🎨 플레이스홀더 커스터마이징
- 🧹 검색어 초기화 기능
- ⌨️ Enter 키 검색 지원
- 💫 부드러운 포커스 애니메이션

### 사용 사례
- 비디오 검색 (제목, 채널명 검색)
- 채널 검색
- 배치 검색
- 전역 검색 기능

### 접근성
- 적절한 라벨링 (aria-label)
- 키보드 네비게이션 지원
- 스크린 리더 호환성
        `,
      },
    },
  },
  argTypes: {
    searchTerm: {
      description: '현재 검색어 값',
      control: { type: 'text' },
    },
    placeholder: {
      description: '플레이스홀더 텍스트',
      control: { type: 'text' },
    },
    onSearchTermChange: {
      description: '검색어 변경 시 호출되는 핸들러',
      action: 'search-changed',
    },
    showFilters: {
      description: '필터 영역 표시 여부',
      control: { type: 'boolean' },
    },
    className: {
      description: '추가 CSS 클래스',
      control: { type: 'text' },
    },
  },
  args: {
    onSearchTermChange: () => console.log('Search term changed'),
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    searchTerm: '',
    placeholder: '검색어를 입력하세요...',
  },
  parameters: {
    docs: {
      description: {
        story: '기본 SearchBar 상태입니다. 빈 검색어와 기본 플레이스홀더가 표시됩니다.',
      },
    },
  },
};

export const WithValue: Story = {
  args: {
    searchTerm: '테스트 검색어',
    placeholder: '검색어를 입력하세요...',
  },
  parameters: {
    docs: {
      description: {
        story: '검색어가 입력된 SearchBar 상태입니다. 초기화 버튼이 표시됩니다.',
      },
    },
  },
};

export const VideoSearch: Story = {
  args: {
    searchTerm: '',
    placeholder: '비디오 제목이나 채널명으로 검색...',
  },
  parameters: {
    docs: {
      description: {
        story: '비디오 검색에 특화된 SearchBar입니다. 비디오와 채널 검색에 사용됩니다.',
      },
    },
  },
};

export const ChannelSearch: Story = {
  args: {
    searchTerm: '',
    placeholder: '채널명 또는 키워드로 검색...',
  },
  parameters: {
    docs: {
      description: {
        story: '채널 검색에 특화된 SearchBar입니다. 채널명과 키워드 검색에 사용됩니다.',
      },
    },
  },
};

export const BatchSearch: Story = {
  args: {
    searchTerm: '',
    placeholder: '배치명으로 검색...',
  },
  parameters: {
    docs: {
      description: {
        story: '배치 검색에 특화된 SearchBar입니다. 수집 배치 검색에 사용됩니다.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    searchTerm: '',
    placeholder: '검색 기능이 비활성화됨',
    className: 'pointer-events-none opacity-50',
  },
  parameters: {
    docs: {
      description: {
        story: '비활성화된 SearchBar 상태입니다. 입력이 불가능합니다.',
      },
    },
  },
};

export const LongPlaceholder: Story = {
  args: {
    searchTerm: '',
    placeholder: '매우 긴 플레이스홀더 텍스트가 표시되는 경우의 SearchBar 동작을 확인할 수 있습니다',
  },
  parameters: {
    docs: {
      description: {
        story: '긴 플레이스홀더 텍스트가 있는 SearchBar입니다. 텍스트 오버플로우 처리를 확인할 수 있습니다.',
      },
    },
  },
};

export const WithLongValue: Story = {
  args: {
    searchTerm: '매우 긴 검색어가 입력된 경우의 SearchBar 동작을 확인해보세요',
    placeholder: '검색어를 입력하세요...',
  },
  parameters: {
    docs: {
      description: {
        story: '긴 검색어가 입력된 SearchBar입니다. 텍스트 스크롤 동작을 확인할 수 있습니다.',
      },
    },
  },
};

export const KoreanSearch: Story = {
  args: {
    searchTerm: '한글 검색어 테스트',
    placeholder: '한글로 검색해보세요...',
  },
  parameters: {
    docs: {
      description: {
        story: '한글 검색어가 입력된 SearchBar입니다. 다국어 지원을 확인할 수 있습니다.',
      },
    },
  },
};

export const EnglishSearch: Story = {
  args: {
    searchTerm: 'English search query',
    placeholder: 'Search in English...',
  },
  parameters: {
    docs: {
      description: {
        story: '영어 검색어가 입력된 SearchBar입니다. 영문 검색 지원을 확인할 수 있습니다.',
      },
    },
  },
};

export const SpecialCharacters: Story = {
  args: {
    searchTerm: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`',
    placeholder: '특수문자 검색 테스트...',
  },
  parameters: {
    docs: {
      description: {
        story: '특수문자가 포함된 검색어입니다. 특수문자 처리를 확인할 수 있습니다.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    searchTerm: '',
    placeholder: '여기에 입력해보세요! Enter로 검색...',
  },
  parameters: {
    docs: {
      description: {
        story: '인터랙티브 데모입니다. 실제로 입력하고 Enter 키를 눌러 동작을 확인해보세요.',
      },
    },
  },
};