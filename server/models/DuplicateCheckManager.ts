import VideoUrl, { VideoUrlModelType } from './VideoUrl';
import ChannelUrl from './ChannelUrl';
import { ServerLogger } from '../utils/logger';

type Platform = 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK';

class DuplicateCheckManager {
  static getVideoModel(): VideoUrlModelType {
    return VideoUrl;
  }

  static async checkVideoDuplicate(normalizedUrl: string, platform: Platform): Promise<any> {
    try {
      const Model = this.getVideoModel();
      const result = await Model.checkDuplicate(normalizedUrl);
      if (result.isDuplicate) {
        result.detectedPlatform = platform;
        result.collectionUsed = 'video_duplicate_check';
      }
      return result;
    } catch (error: any) {
      ServerLogger.error(`비디오 중복 검사 실패 (${platform})`, { error: error.message }, 'DUPLICATE_MANAGER');
      return { isDuplicate: false, error: error.message };
    }
  }

  static async registerVideoUrl(
    normalizedUrl: string,
    originalUrl: string,
    platform: Platform,
    sheetLocation: any,
    originalPublishDate: Date | null = null
  ): Promise<any> {
    try {
      const Model = this.getVideoModel();
      return await Model.registerUrl(normalizedUrl, originalUrl, platform, sheetLocation, originalPublishDate);
    } catch (error: any) {
      ServerLogger.error(`비디오 URL 등록 실패 (${platform})`, { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }

  static async updateVideoStatus(
    normalizedUrl: string,
    platform: Platform,
    status: 'processing' | 'completed' | 'failed',
    sheetLocation: any | null = null,
    originalPublishDate: Date | null = null
  ): Promise<any> {
    try {
      const Model = this.getVideoModel();
      return await Model.updateStatus(normalizedUrl, status, sheetLocation, originalPublishDate);
    } catch (error: any) {
      ServerLogger.error(`비디오 상태 업데이트 실패 (${platform})`, { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }

  static async checkChannelDuplicate(normalizedChannelId: string): Promise<any> {
    try {
      return await ChannelUrl.checkDuplicate(normalizedChannelId);
    } catch (error: any) {
      ServerLogger.error('채널 중복 검사 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { isDuplicate: false, error: error.message };
    }
  }

  static async registerChannel(
    normalizedChannelId: string,
    originalChannelIdentifier: string,
    platform: Platform,
    channelInfo: any = {},
    analysisJob: any = {}
  ): Promise<any> {
    try {
      return await ChannelUrl.registerChannel(normalizedChannelId, originalChannelIdentifier, platform, channelInfo, analysisJob);
    } catch (error: any) {
      ServerLogger.error('채널 등록 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }

  static async updateChannelStatus(
    normalizedChannelId: string,
    status: 'processing' | 'completed' | 'failed',
    channelInfo: any | null = null
  ): Promise<any> {
    try {
      return await ChannelUrl.updateStatus(normalizedChannelId, status, channelInfo);
    } catch (error: any) {
      ServerLogger.error('채널 상태 업데이트 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }

  static async removeChannel(normalizedChannelId: string): Promise<any> {
    try {
      return await ChannelUrl.removeChannel(normalizedChannelId);
    } catch (error: any) {
      ServerLogger.error('채널 삭제 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }

  static async getComprehensiveStats(): Promise<any> {
    try {
      const [videoStats, channelStats] = await Promise.all([
        VideoUrl.getStats(),
        ChannelUrl.getStats()
      ]);
      return {
        videos: videoStats,
        channels: channelStats,
        summary: {
          totalVideos: videoStats.total || 0,
          totalChannels: channelStats.total || 0,
          lastUpdated: new Date()
        }
      };
    } catch (error: any) {
      ServerLogger.error('종합 통계 조회 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { error: error.message };
    }
  }

  static async cleanupAllStaleProcessing(): Promise<any> {
    try {
      const [videoResult, channelResult] = await Promise.all([
        VideoUrl.cleanupStaleProcessing(),
        ChannelUrl.cleanupStaleProcessing()
      ]);
      const totalDeleted = (videoResult.deletedCount || 0) + (channelResult.deletedCount || 0);
      if (totalDeleted > 0) {
        ServerLogger.info(`전체 오래된 processing 레코드 정리: ${totalDeleted}개`, null, 'DUPLICATE_MANAGER');
      }
      return {
        success: true,
        videos: videoResult.deletedCount || 0,
        channels: channelResult.deletedCount || 0,
        total: totalDeleted
      };
    } catch (error: any) {
      ServerLogger.error('전체 processing 레코드 정리 실패', { error: error.message }, 'DUPLICATE_MANAGER');
      return { success: false, error: error.message };
    }
  }
}

export default DuplicateCheckManager;
