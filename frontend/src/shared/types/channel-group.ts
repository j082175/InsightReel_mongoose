/**
 * 🎯 ChannelGroup 타입 정의 (통합)
 */

export interface ChannelGroupChannel {
  channelId: string; // id → channelId (서버 스키마와 통일)
  name: string;
}

export interface ChannelGroup {
  _id?: string; // 생성 시에는 없을 수 있음
  name: string;
  description: string;
  color: string;
  channels: ChannelGroupChannel[]; // 객체 배열만 지원 (서버 스키마와 일치)
  keywords: string[];
  isActive: boolean;
  lastCollectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChannelGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ChannelGroup) => void;
  editingGroup?: ChannelGroup | null;
  availableChannels?: string[];
}
