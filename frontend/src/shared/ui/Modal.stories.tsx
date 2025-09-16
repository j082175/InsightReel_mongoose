import type { Meta, StoryObj } from '@storybook/react';
import Modal from '../components/Modal';
import AnimatedButton from '../components/animations/AnimatedButton';

const meta: Meta<typeof Modal> = {
  title: 'Shared/UI/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**Modal**은 오버레이 위에 콘텐츠를 표시하는 범용 모달 컴포넌트입니다.

### 주요 기능
- 🎭 Framer Motion 기반 부드러운 애니메이션
- 🎨 다양한 크기 옵션 (sm, md, lg, xl, full)
- 🖱️ ESC 키와 오버레이 클릭으로 닫기
- 🔒 바디 스크롤 방지
- ♿ 접근성 최적화 (포커스 트랩, ARIA)

### 애니메이션 효과
- **Enter**: 페이드인 + 스케일업 (0.95 → 1.0)
- **Exit**: 페이드아웃 + 스케일다운 (1.0 → 0.95)
- **Duration**: 0.2초 부드러운 전환

### 사용 사례
- 비디오 분석 모달
- 채널 분석 모달
- 설정 모달
- 확인/경고 다이얼로그
- 폼 입력 모달
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
    title: {
      description: '모달 제목',
      control: { type: 'text' },
    },
    size: {
      description: '모달 크기',
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    children: {
      description: '모달 내용',
      control: { type: 'text' },
    },
  },
  args: {
    onClose: () => console.log('Modal closed'),
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    isOpen: false,
    title: '닫힌 모달',
    children: '이 모달은 현재 닫혀있습니다.',
  },
  parameters: {
    docs: {
      description: {
        story: '닫힌 상태의 모달입니다. 화면에 표시되지 않습니다.',
      },
    },
  },
};

export const Small: Story = {
  args: {
    isOpen: true,
    title: '작은 모달',
    size: 'sm',
    children: (
      <div className="space-y-4">
        <p>작은 크기의 모달입니다. 간단한 확인 메시지나 짧은 폼에 사용됩니다.</p>
        <div className="flex justify-end space-x-2">
          <AnimatedButton variant="secondary" size="sm">취소</AnimatedButton>
          <AnimatedButton variant="primary" size="sm">확인</AnimatedButton>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '작은 크기(sm)의 모달입니다. 간단한 확인 다이얼로그에 적합합니다.',
      },
    },
  },
};

export const Medium: Story = {
  args: {
    isOpen: true,
    title: '중간 모달',
    size: 'md',
    children: (
      <div className="space-y-4">
        <p>중간 크기의 모달입니다. 기본 크기로 가장 많이 사용됩니다.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-100 rounded">
            <h4 className="font-semibold">섹션 1</h4>
            <p>첫 번째 섹션 내용</p>
          </div>
          <div className="p-4 bg-gray-100 rounded">
            <h4 className="font-semibold">섹션 2</h4>
            <p>두 번째 섹션 내용</p>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <AnimatedButton variant="secondary">취소</AnimatedButton>
          <AnimatedButton variant="primary">저장</AnimatedButton>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '중간 크기(md)의 모달입니다. 기본적인 폼이나 정보 표시에 적합합니다.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    isOpen: true,
    title: '큰 모달',
    size: 'lg',
    children: (
      <div className="space-y-6">
        <p>큰 크기의 모달입니다. 복잡한 폼이나 상세 정보 표시에 사용됩니다.</p>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-4 bg-blue-50 rounded">
              <h4 className="font-semibold">카드 {i}</h4>
              <p>카드 {i}의 내용입니다.</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <AnimatedButton variant="warning">리셋</AnimatedButton>
          <div className="space-x-2">
            <AnimatedButton variant="secondary">취소</AnimatedButton>
            <AnimatedButton variant="primary">저장</AnimatedButton>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '큰 크기(lg)의 모달입니다. 복잡한 콘텐츠나 다중 섹션에 적합합니다.',
      },
    },
  },
};

export const ExtraLarge: Story = {
  args: {
    isOpen: true,
    title: '매우 큰 모달',
    size: 'xl',
    children: (
      <div className="space-y-6">
        <p>매우 큰 크기의 모달입니다. 대시보드나 상세 분석 화면에 사용됩니다.</p>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="p-4 bg-green-50 rounded">
              <h4 className="font-semibold">섹션 {i}</h4>
              <p>섹션 {i}의 상세 내용입니다.</p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: `${Math.random() * 100}%`}}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <div className="space-x-2">
            <AnimatedButton variant="secondary" size="sm">내보내기</AnimatedButton>
            <AnimatedButton variant="warning" size="sm">새로고침</AnimatedButton>
          </div>
          <div className="space-x-2">
            <AnimatedButton variant="secondary">취소</AnimatedButton>
            <AnimatedButton variant="primary">적용</AnimatedButton>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '매우 큰 크기(xl)의 모달입니다. 대시보드나 상세 분석 화면에 적합합니다.',
      },
    },
  },
};

export const FullScreen: Story = {
  args: {
    isOpen: true,
    title: '전체화면 모달',
    size: 'full',
    children: (
      <div className="space-y-6 h-full">
        <p>전체 화면 크기의 모달입니다. 복잡한 워크플로우나 전체 페이지 대체에 사용됩니다.</p>
        <div className="grid grid-cols-6 gap-4 flex-1">
          {Array.from({length: 18}, (_, i) => (
            <div key={i} className="p-4 bg-purple-50 rounded">
              <h4 className="font-semibold">항목 {i + 1}</h4>
              <p>항목 {i + 1}의 내용</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t pt-4">
          <div className="space-x-2">
            <AnimatedButton variant="secondary">도움말</AnimatedButton>
            <AnimatedButton variant="warning">리셋</AnimatedButton>
          </div>
          <div className="space-x-2">
            <AnimatedButton variant="secondary">취소</AnimatedButton>
            <AnimatedButton variant="success">완료</AnimatedButton>
          </div>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '전체 화면(full) 크기의 모달입니다. 복잡한 워크플로우나 전체 페이지 대체에 적합합니다.',
      },
    },
  },
};

export const LongContent: Story = {
  args: {
    isOpen: true,
    title: '긴 콘텐츠 모달',
    size: 'md',
    children: (
      <div className="space-y-4">
        <p>스크롤이 필요한 긴 콘텐츠가 있는 모달입니다.</p>
        {Array.from({length: 20}, (_, i) => (
          <div key={i} className="p-4 border rounded">
            <h4 className="font-semibold">항목 {i + 1}</h4>
            <p>이것은 항목 {i + 1}의 내용입니다. 모달 내부에서 스크롤이 어떻게 작동하는지 확인할 수 있습니다.</p>
          </div>
        ))}
        <div className="flex justify-end space-x-2 sticky bottom-0 bg-white pt-4 border-t">
          <AnimatedButton variant="secondary">취소</AnimatedButton>
          <AnimatedButton variant="primary">확인</AnimatedButton>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '긴 콘텐츠가 있는 모달입니다. 내부 스크롤과 고정 푸터 동작을 확인할 수 있습니다.',
      },
    },
  },
};

export const NoTitle: Story = {
  args: {
    isOpen: true,
    size: 'md',
    children: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">커스텀 제목</h2>
        <p>제목이 없는 모달입니다. 콘텐츠에서 직접 제목을 관리할 수 있습니다.</p>
        <div className="flex justify-end space-x-2">
          <AnimatedButton variant="secondary">취소</AnimatedButton>
          <AnimatedButton variant="primary">확인</AnimatedButton>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: '기본 제목 없이 콘텐츠에서 직접 제목을 관리하는 모달입니다.',
      },
    },
  },
};