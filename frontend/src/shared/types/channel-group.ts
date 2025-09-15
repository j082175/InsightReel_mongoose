/**
 * 🎯 ChannelGroup 타입 정의 (통합)
 */

export interface ChannelGroupChannel {
  channelId: string;   // id → channelId (서버 스키마와 통일)
  name: string;
}

export interface ChannelGroup {
  _id: string;         // 필수 필드로 변경
  name: string;
  description: string;
  color: string;
  channels: ChannelGroupChannel[] | string[]; // 두 형태 모두 지원
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