const HighViewCollector = require('./HighViewCollector');
const ChannelGroup = require('../models/ChannelGroup');
const TrendingVideo = require('../models/TrendingVideo');
const DurationClassifier = require('../utils/duration-classifier');
const { ServerLogger } = require('../utils/logger');

/**
 * 🎯 그룹별 트렌딩 영상 수집기
 * HighViewCollector를 확장하여 그룹 기반 수집 및 TrendingVideo 저장
 */
class GroupTrendingCollector {
  constructor() {
    this.highViewCollector = new HighViewCollector();
  }

  /**
   * 특정 그룹의 트렌딩 영상 수집
   * @param {string} groupId - 채널 그룹 ID
   * @param {Object} options - 수집 옵션
   */
  async collectGroupTrending(groupId, options = {}) {
    try {
      // 그룹 정보 조회
      const group = await ChannelGroup.findById(groupId);
      if (!group) {
        throw new Error(`채널 그룹을 찾을 수 없습니다: ${groupId}`);
      }

      if (group.channels.length === 0) {
        ServerLogger.warn(`⚠️ 그룹 "${group.name}"에 채널이 없습니다`);
        return {
          groupId,
          groupName: group.name,
          totalVideos: 0,
          savedVideos: 0,
          videos: []
        };
      }

      ServerLogger.info(`🎯 그룹 "${group.name}" 트렌딩 수집 시작 (${group.channels.length}개 채널)`);

      // HighViewCollector로 영상 수집
      const results = await this.highViewCollector.collectFromChannels(group.channels, options);
      
      // 수집된 영상들을 TrendingVideo로 변환 및 저장
      const savedVideos = [];
      let savedCount = 0;

      for (const channelResult of (results.videos || [])) {
        if (channelResult.videos && channelResult.videos.length > 0) {
          for (const video of channelResult.videos) {
            try {
              const trendingVideo = await this.saveTrendingVideo(video, group);
              if (trendingVideo) {
                savedVideos.push(trendingVideo);
                savedCount++;
              }
            } catch (error) {
              ServerLogger.error(`영상 저장 실패 (${video.id?.videoId || 'unknown'}):`, error.message);
            }
          }
        }
      }

      // 그룹의 마지막 수집 시간 업데이트
      await group.updateLastCollected();

      ServerLogger.success(`✅ 그룹 "${group.name}" 수집 완료: ${savedCount}개 영상 저장`);

      return {
        groupId,
        groupName: group.name,
        totalVideos: results.totalVideos || 0,
        savedVideos: savedCount,
        videos: savedVideos,
        quotaUsed: results.quotaUsed || 0
      };

    } catch (error) {
      ServerLogger.error(`❌ 그룹 트렌딩 수집 실패 (${groupId}):`, error);
      throw error;
    }
  }

  /**
   * 모든 활성 그룹의 트렌딩 영상 수집
   * @param {Object} options - 수집 옵션
   */
  async collectAllActiveGroups(options = {}) {
    try {
      const activeGroups = await ChannelGroup.findActive();
      
      if (activeGroups.length === 0) {
        ServerLogger.warn('⚠️ 활성화된 채널 그룹이 없습니다');
        return { results: [], totalGroups: 0, totalVideos: 0 };
      }

      ServerLogger.info(`🚀 전체 그룹 트렌딩 수집 시작: ${activeGroups.length}개 그룹`);

      const results = [];
      let totalVideos = 0;

      for (const group of activeGroups) {
        try {
          const result = await this.collectGroupTrending(group._id, options);
          results.push({
            groupId: group._id,
            groupName: group.name,
            status: 'success',
            savedVideos: result.savedVideos,
            totalVideos: result.totalVideos,
            quotaUsed: result.quotaUsed
          });
          totalVideos += result.savedVideos;
        } catch (error) {
          ServerLogger.error(`그룹 수집 실패 (${group.name}):`, error.message);
          results.push({
            groupId: group._id,
            groupName: group.name,
            status: 'failed',
            error: error.message,
            savedVideos: 0,
            totalVideos: 0
          });
        }

        // 그룹 간 딜레이 (API 제한 방지)
        await this.delay(500);
      }

      ServerLogger.success(`🏁 전체 그룹 수집 완료: ${totalVideos}개 영상`);

      return {
        results,
        totalGroups: activeGroups.length,
        totalVideos,
        successGroups: results.filter(r => r.status === 'success').length
      };

    } catch (error) {
      ServerLogger.error('❌ 전체 그룹 수집 실패:', error);
      throw error;
    }
  }

  /**
   * YouTube API 영상 데이터를 TrendingVideo로 변환 및 저장
   * @param {Object} videoData - YouTube API 영상 데이터
   * @param {Object} group - 채널 그룹 정보
   */
  async saveTrendingVideo(videoData, group) {
    try {
      // 기존 영상 중복 체크
      const existingVideo = await TrendingVideo.findOne({ videoId: videoData.id?.videoId });
      if (existingVideo) {
        return null; // 이미 존재하는 영상
      }

      // Duration 분류
      const durationSeconds = DurationClassifier.parseDuration(videoData.contentDetails?.duration);
      const durationCategory = DurationClassifier.categorizeByDuration(durationSeconds);

      const trendingVideo = new TrendingVideo({
        videoId: videoData.id?.videoId,
        title: videoData.snippet?.title,
        url: `https://www.youtube.com/watch?v=${videoData.id?.videoId}`,
        platform: 'YOUTUBE',
        
        // 채널 정보
        channelName: videoData.snippet?.channelTitle,
        channelId: videoData.snippet?.channelId,
        channelUrl: `https://www.youtube.com/channel/${videoData.snippet?.channelId}`,
        
        // 그룹 정보
        groupId: group._id,
        groupName: group.name,
        collectionDate: new Date(),
        collectedFrom: 'trending',
        
        // 통계
        views: parseInt(videoData.statistics?.viewCount) || 0,
        likes: parseInt(videoData.statistics?.likeCount) || 0,
        commentsCount: parseInt(videoData.statistics?.commentCount) || 0,
        
        // 메타데이터
        uploadDate: new Date(videoData.snippet?.publishedAt),
        duration: durationCategory,
        durationSeconds: durationSeconds,
        thumbnailUrl: videoData.snippet?.thumbnails?.high?.url,
        description: videoData.snippet?.description?.substring(0, 1000), // 1000자 제한
        
        // 키워드 (그룹 키워드 상속)
        keywords: group.keywords || []
      });

      const saved = await trendingVideo.save();
      return saved;

    } catch (error) {
      ServerLogger.error('TrendingVideo 저장 실패:', error);
      return null;
    }
  }

  /**
   * 딜레이 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GroupTrendingCollector;