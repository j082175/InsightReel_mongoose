/**
 * 🎯 Channel Management Feature - API Layer
 *
 * 채널 관리 관련 API 호출 로직을 담당
 * - 채널 CRUD 작업
 * - 채널 그룹 관리
 * - 채널 통계 및 분석
 */

import { ChannelEntity, ChannelGroupEntity } from '../../../entities';

// ===== API Request/Response Types =====
export interface CreateChannelRequest {
  name: string;
  url: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  description?: string;
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  customUrl?: string;
  contentType?: 'shortform' | 'longform' | 'mixed';
}

export interface CreateChannelGroupRequest {
  name: string;
  description?: string;
  channels: string[]; // 채널 ID 배열
  color?: string;
}

export interface ChannelStatsResponse {
  channelId: string;
  totalVideos: number;
  totalViews: number;
  subscriberGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  engagementMetrics: {
    averageLikes: number;
    averageComments: number;
    engagementRate: number;
  };
  uploadPattern: {
    frequency: string;
    bestDays: string[];
    bestTimes: string[];
  };
}

// ===== Channel API Functions =====

/**
 * 모든 채널 목록 조회
 */
export const fetchChannels = async (): Promise<ChannelEntity[]> => {
  try {
    const response = await fetch('/api/channels');
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch channels error:', error);
    throw error;
  }
};

/**
 * 개별 채널 조회
 */
export const fetchChannel = async (
  channelId: string
): Promise<ChannelEntity> => {
  try {
    const response = await fetch(`/api/channels/${channelId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch channel: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch channel error:', error);
    throw error;
  }
};

/**
 * 새 채널 생성
 */
export const createChannel = async (
  data: CreateChannelRequest
): Promise<ChannelEntity> => {
  try {
    const response = await fetch('/api/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create channel: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create channel error:', error);
    throw error;
  }
};

/**
 * 채널 정보 업데이트
 */
export const updateChannel = async (
  channelId: string,
  data: UpdateChannelRequest
): Promise<ChannelEntity> => {
  try {
    const response = await fetch(`/api/channels/${channelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update channel: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update channel error:', error);
    throw error;
  }
};

/**
 * 채널 삭제
 */
export const deleteChannel = async (channelId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/channels/${channelId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete channel: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Delete channel error:', error);
    throw error;
  }
};

/**
 * 채널 통계 조회
 */
export const fetchChannelStats = async (
  channelId: string
): Promise<ChannelStatsResponse> => {
  try {
    const response = await fetch(`/api/channels/${channelId}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch channel stats: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch channel stats error:', error);
    throw error;
  }
};

// ===== Channel Group API Functions =====

/**
 * 모든 채널 그룹 조회
 */
export const fetchChannelGroups = async (): Promise<ChannelGroupEntity[]> => {
  try {
    const response = await fetch('/api/channel-groups');
    if (!response.ok) {
      throw new Error(`Failed to fetch channel groups: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch channel groups error:', error);
    throw error;
  }
};

/**
 * 새 채널 그룹 생성
 */
export const createChannelGroup = async (
  data: CreateChannelGroupRequest
): Promise<ChannelGroupEntity> => {
  try {
    const response = await fetch('/api/channel-groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create channel group: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Create channel group error:', error);
    throw error;
  }
};

/**
 * 채널 그룹 업데이트
 */
export const updateChannelGroup = async (
  groupId: string,
  data: Partial<CreateChannelGroupRequest>
): Promise<ChannelGroupEntity> => {
  try {
    const response = await fetch(`/api/channel-groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update channel group: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Update channel group error:', error);
    throw error;
  }
};

/**
 * 채널 그룹 삭제
 */
export const deleteChannelGroup = async (groupId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/channel-groups/${groupId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete channel group: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Delete channel group error:', error);
    throw error;
  }
};

// ===== Bulk Operations =====

/**
 * 여러 채널 일괄 삭제
 */
export const deleteChannelsBulk = async (
  channelIds: string[]
): Promise<void> => {
  try {
    const response = await fetch('/api/channels/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelIds }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk delete channels: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Bulk delete channels error:', error);
    throw error;
  }
};
