import React from 'react';
import { screen } from '@testing-library/react';
import {
  render,
  mockVideo,
  userEvent,
} from '../../../__tests__/utils/test-utils';
import VideoCard from '../VideoCard';

// VideoCard 테스트 모킹
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ children, ...props }: any) => <img {...props} />,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('VideoCard', () => {
  const defaultProps = {
    video: mockVideo,
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    test('비디오 정보가 올바르게 표시된다', () => {
      render(<VideoCard {...defaultProps} />);

      // 비디오 제목
      expect(screen.getByText(mockVideo.title)).toBeInTheDocument();

      // 채널명
      expect(screen.getByText(mockVideo.channelName)).toBeInTheDocument();

      // 조회수 (formatViews 함수로 포맷팅된 형태)
      expect(screen.getByText('100만')).toBeInTheDocument();

      // 플랫폼
      expect(screen.getByText('YOUTUBE')).toBeInTheDocument();

      // 썸네일 이미지
      const thumbnail = screen.getByAltText(mockVideo.title);
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', mockVideo.thumbnailUrl);
    });

    test('영상 길이 정보가 표시된다', () => {
      render(<VideoCard {...defaultProps} />);

      // getDurationLabel 함수로 변환된 형태
      expect(screen.getByText('미드폼')).toBeInTheDocument();
    });

    test('업로드 날짜가 표시된다', () => {
      render(<VideoCard {...defaultProps} />);

      // formatDate 함수로 포맷팅된 날짜가 표시되는지 확인
      expect(screen.getByText(/1월 15일/)).toBeInTheDocument();
    });
  });

  describe('상호작용 테스트', () => {
    test('비디오 클릭 시 onClick 핸들러가 호출된다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(<VideoCard {...defaultProps} onClick={mockOnClick} />);

      const videoCard = screen.getByText(mockVideo.title).closest('div');
      await user.click(videoCard!);

      expect(mockOnClick).toHaveBeenCalledWith(mockVideo);
    });

    test('정보 버튼 클릭 시 onInfoClick 핸들러가 호출된다', async () => {
      const mockOnInfoClick = jest.fn();
      const user = userEvent.setup();

      render(<VideoCard {...defaultProps} onInfoClick={mockOnInfoClick} />);

      const infoButton = screen.getByTitle('상세 정보');
      await user.click(infoButton);

      expect(mockOnInfoClick).toHaveBeenCalledWith(mockVideo);
    });

    test('삭제 버튼 클릭 시 onDelete 핸들러가 호출된다', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(<VideoCard {...defaultProps} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByTitle('삭제');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockVideo);
    });

    test('채널명 클릭 시 onChannelClick 핸들러가 호출된다', async () => {
      const mockOnChannelClick = jest.fn();
      const user = userEvent.setup();

      render(
        <VideoCard {...defaultProps} onChannelClick={mockOnChannelClick} />
      );

      const channelButton = screen.getByText(mockVideo.channelName);
      await user.click(channelButton);

      expect(mockOnChannelClick).toHaveBeenCalledWith(mockVideo.channelName);
    });
  });

  describe('선택 모드 테스트', () => {
    test('선택 모드가 활성화되면 체크박스가 표시된다', () => {
      render(<VideoCard {...defaultProps} isSelectMode={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    test('선택된 상태에서는 체크박스가 체크된다', () => {
      render(
        <VideoCard {...defaultProps} isSelectMode={true} isSelected={true} />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    test('체크박스 클릭 시 onSelectToggle이 호출된다', async () => {
      const mockOnSelectToggle = jest.fn();
      const user = userEvent.setup();

      render(
        <VideoCard
          {...defaultProps}
          isSelectMode={true}
          onSelectToggle={mockOnSelectToggle}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnSelectToggle).toHaveBeenCalledWith(mockVideo._id);
    });

    test('선택 모드에서 카드 클릭 시 onSelectToggle이 호출된다', async () => {
      const mockOnSelectToggle = jest.fn();
      const user = userEvent.setup();

      render(
        <VideoCard
          {...defaultProps}
          isSelectMode={true}
          onSelectToggle={mockOnSelectToggle}
        />
      );

      const videoCard = screen.getByText(mockVideo.title).closest('div');
      await user.click(videoCard!);

      expect(mockOnSelectToggle).toHaveBeenCalledWith(mockVideo._id);
    });
  });

  describe('아카이브 정보 표시', () => {
    test('showArchiveInfo가 true이고 collectedAt이 있으면 수집 정보가 표시된다', () => {
      const videoWithCollectedAt = {
        ...mockVideo,
        collectedAt: '2024-01-15T12:00:00Z',
      };

      render(
        <VideoCard
          {...defaultProps}
          video={videoWithCollectedAt}
          showArchiveInfo={true}
        />
      );

      expect(screen.getByText(/수집:/)).toBeInTheDocument();
    });

    test('showArchiveInfo가 false이면 수집 정보가 표시되지 않는다', () => {
      const videoWithCollectedAt = {
        ...mockVideo,
        collectedAt: '2024-01-15T12:00:00Z',
      };

      render(
        <VideoCard
          {...defaultProps}
          video={videoWithCollectedAt}
          showArchiveInfo={false}
        />
      );

      expect(screen.queryByText(/수집:/)).not.toBeInTheDocument();
    });
  });

  describe('접근성 테스트', () => {
    test('썸네일 이미지에 적절한 alt 텍스트가 있다', () => {
      render(<VideoCard {...defaultProps} />);

      const thumbnail = screen.getByAltText(mockVideo.title);
      expect(thumbnail).toBeInTheDocument();
    });

    test('버튼들에 적절한 title 속성이 있다', () => {
      render(<VideoCard {...defaultProps} onInfoClick={jest.fn()} />);

      expect(screen.getByTitle('상세 정보')).toBeInTheDocument();
      expect(screen.getByTitle('삭제')).toBeInTheDocument();
    });

    test('체크박스는 올바른 역할을 가진다', () => {
      render(<VideoCard {...defaultProps} isSelectMode={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });
});
