/**
 * 🎯 ChannelGroup 타입 정의 (통합)
 */

export interface ChannelGroupChannel {
  id: string;
  name: string;
}

export interface ChannelGroup {
  _id?: string;
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