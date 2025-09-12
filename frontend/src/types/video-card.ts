/**
 * 🎬 VideoCard 컴포넌트 전용 타입 정의
 */

export interface VideoCardData {
  _id?: string;
  videoId?: string;
  id?: string | number;
  title: string;
  url: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  channelName: string;
  channelUrl?: string;
  views?: number;
  viewCount?: number;
  likes?: number;
  platform?: string;
  duration?: string;
  uploadDate: string;
}

export interface VideoCardProps {
  video: VideoCardData;
  onClick?: (video: VideoCardData) => void;
  onInfoClick?: (video: VideoCardData) => void;
  onChannelClick?: (channelName: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string | number) => void;
  showArchiveInfo?: boolean;
}