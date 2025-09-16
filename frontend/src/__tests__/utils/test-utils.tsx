import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 모든 Provider들을 포함하는 래퍼 컴포넌트
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 테스트용 QueryClient 생성 (각 테스트마다 새로 생성)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 테스트에서는 재시도 비활성화
        gcTime: Infinity, // 가비지 컬렉션 비활성화
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// 커스텀 render 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// React Testing Library의 모든 export를 재export
export * from '@testing-library/react';

// 커스텀 render를 기본 render로 덮어쓰기
export { customRender as render };

// 공통 테스트 데이터
export const mockVideo = {
  _id: 'test-video-1',
  title: '테스트 비디오 제목',
  url: 'https://example.com/video/1',
  thumbnailUrl: 'https://example.com/thumbnail/1.jpg',
  views: 1000000,
  uploadDate: '2024-01-15T10:00:00Z',
  platform: 'YOUTUBE' as const,
  channelName: '테스트 채널',
  channelUrl: 'https://example.com/channel/test',
  duration: 'MID',
  keywords: ['테스트', '비디오'],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  aspectRatio: '16:9' as const,
  channelAvatarUrl: 'https://example.com/avatar/test.jpg',
  isTrending: false,
  daysAgo: 5,
  likes: 50000,
  commentsCount: 1000,
};

export const mockChannel = {
  _id: 'test-channel-1',
  channelId: 'UC123456789',
  name: '테스트 채널',
  url: 'https://example.com/channel/test',
  platform: 'YOUTUBE' as const,
  subscribers: 1000000,
  totalViews: 50000000,
  totalVideos: 100,
  keywords: ['테스트', '채널'],
  categoryInfo: {
    majorCategory: '엔터테인먼트',
    middleCategory: '음악',
    subCategory: 'K-POP',
    fullCategoryPath: '엔터테인먼트 > 음악 > K-POP',
    consistencyLevel: 'high' as const,
  },
  lastAnalyzedAt: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

export const mockChannelGroup = {
  _id: 'test-group-1',
  name: '테스트 채널 그룹',
  description: '테스트용 채널 그룹입니다',
  color: '#3B82F6',
  channels: ['UC123456789', 'UC987654321'],
  keywords: ['테스트', '그룹'],
  isActive: true,
  lastCollectedAt: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

// 공통 모킹 함수들
export const mockFetch = (data: any, status = 200) => {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  });
};

// userEvent를 직접 export하여 테스트에서 바로 사용
export { userEvent } from '@testing-library/user-event';
