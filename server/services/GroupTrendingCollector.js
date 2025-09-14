const HighViewCollector = require('./HighViewCollector');
const ChannelGroup = require('../models/ChannelGroup');
const TrendingVideo = require('../models/TrendingVideo');
const DurationClassifier = require('../utils/duration-classifier');
const { ServerLogger } = require('../utils/logger');
const { PLATFORMS } = require('../config/api-messages');

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

      // HighViewCollector로 영상 수집 (채널 ID만 추출)
      const channelIds = group.channels.map(channel => channel.channelId);
      ServerLogger.info(`🔍 추출된 채널 IDs: ${channelIds.join(', ')}`);
      const results = await this.highViewCollector.collectFromChannels(channelIds, options);
      
      // 수집된 영상들을 TrendingVideo로 변환 및 저장
      const savedVideos = [];
      let savedCount = 0;
      let duplicateCount = 0;
      let totalFoundCount = 0;

      for (const channelResult of (results.videos || [])) {
        if (channelResult.videos && channelResult.videos.length > 0) {
          totalFoundCount += channelResult.videos.length;
          for (const video of channelResult.videos) {
            try {
              const trendingVideo = await this.saveTrendingVideo(video, group);
              if (trendingVideo) {
                savedVideos.push(trendingVideo);
                savedCount++;
              } else {
                duplicateCount++;
              }
            } catch (error) {
              ServerLogger.error(`영상 저장 실패 (${video.id?.videoId || 'unknown'}):`, error.message);
            }
          }
        }
      }

      // 그룹의 마지막 수집 시간 업데이트
      await group.updateLastCollected();

      ServerLogger.success(`✅ 그룹 "${group.name}" 수집 완료: ${savedCount}개 새 영상 저장 (${duplicateCount}개 중복 스킵, 총 ${totalFoundCount}개 발견)`);

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
   * @param {String} batchId - 배치 ID (선택사항)
   */
  async saveTrendingVideo(videoData, group, batchId = null) {
    try {
      // 기존 영상 중복 체크
      const videoId = videoData.id?.videoId;
      const existingVideo = await TrendingVideo.findOne({ videoId: videoId });
      if (existingVideo) {
        ServerLogger.warn(`⚠️ 중복 영상 스킵: ${videoData.snippet?.title} (${videoId})`);
        return null; // 이미 존재하는 영상
      }

      // Duration 분류
      const durationSeconds = DurationClassifier.parseDuration(videoData.contentDetails?.duration);
      const durationCategory = DurationClassifier.categorizeByDuration(durationSeconds);

      const trendingVideo = new TrendingVideo({
        videoId: videoData.id?.videoId,
        title: videoData.snippet?.title,
        url: `https://www.youtube.com/watch?v=${videoData.id?.videoId}`,
        platform: PLATFORMS.YOUTUBE,
        
        // 채널 정보
        channelName: videoData.snippet?.channelTitle,
        channelId: videoData.snippet?.channelId,
        channelUrl: `https://www.youtube.com/channel/${videoData.snippet?.channelId}`,
        
        // 그룹 정보
        groupId: group._id,
        groupName: group.name,
        batchId: batchId, // 배치 ID 추가
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
   * 채널 목록에서 직접 트렌딩 영상 수집
   * @param {Object} options - 수집 옵션 (channels 배열 포함)
   */
  async collectFromChannels(options = {}) {
    try {
      const { 
        channels, 
        daysBack = 7,
        minViews = 10000, 
        maxViews = null,
        includeShorts = true, 
        includeMidform = true, 
        includeLongForm = true,
        keywords = [],
        excludeKeywords = [],
        batchId = null
      } = options;

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        throw new Error('채널 목록이 필요합니다');
      }

      ServerLogger.info(`🎯 다중 채널 트렌딩 수집 시작: ${channels.length}개 채널`);

      // 날짜 범위 설정
      console.log('🔍 DEBUG GroupTrendingCollector: daysBack =', daysBack);
      const endDate = new Date();
      const startDate = new Date(endDate - (daysBack * 24 * 60 * 60 * 1000));
      const publishedAfter = startDate.toISOString();
      const publishedBefore = endDate.toISOString();
      console.log('🔍 DEBUG GroupTrendingCollector: 계산된 날짜 범위:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      ServerLogger.info(`📅 수집 기간: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`);

      // HighViewCollector를 사용해서 영상 수집
      const collectorOptions = {
        daysBack,
        minViews,
        maxViews,
        includeShorts,
        includeMidform,
        includeLongForm,
        keywords,
        excludeKeywords
      };

      // 각 채널별로 직접 영상 수집 및 저장
      let savedCount = 0;
      const savedVideos = [];
      let totalQuotaUsed = 0;

      for (const channelId of channels) {
        try {
          // 개별 채널에서 영상 수집
          const channelResult = await this.highViewCollector.collectChannelTrending(
            channelId,
            publishedAfter,
            publishedBefore,
            { 
              minViews: collectorOptions.minViews,
              maxResultsPerSearch: 50
            }
          );

          totalQuotaUsed += channelResult.quotaUsed || 0;

          // 수집된 영상들을 TrendingVideo로 저장
          if (channelResult.videos && channelResult.videos.length > 0) {
            ServerLogger.info(`🎬 채널 ${channelId}에서 ${channelResult.videos.length}개 영상 처리 시작`);
            for (const video of channelResult.videos) {
              try {
                // 영상 중복 검사 (같은 배치 내에서만 중복 체크)
                const videoId = video.id; // Videos API는 id가 직접 문자열
                ServerLogger.info(`🔍 영상 ID 체크: ${videoId} (${video.snippet?.title})`);
                
                // 같은 배치 내에서만 중복 검사 (배치별 중복 방지)
                const existingVideo = await TrendingVideo.findOne({ 
                  videoId: videoId,
                  batchId: batchId  // 같은 배치 내에서만 중복 체크
                });
                
                if (existingVideo) {
                  ServerLogger.info(`⏭️ 배치 내 중복 영상 건너뛰기: ${videoId} (${video.snippet?.title})`);
                  continue; // 같은 배치에서 이미 존재하는 영상은 건너뛰기
                }
                
                ServerLogger.info(`💾 새로운 영상 저장 시작: ${videoId}`);  

                // Duration 분류
                const durationSeconds = DurationClassifier.parseDuration(video.contentDetails?.duration);
                const durationCategory = DurationClassifier.categorizeByDuration(durationSeconds);
                
                ServerLogger.info(`🕒 영상 길이 분류: ${video.contentDetails?.duration} → ${durationSeconds}초 → ${durationCategory}`);

                const trendingVideoData = {
                  videoId: videoId,
                  title: video.snippet?.title,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  platform: PLATFORMS.YOUTUBE,
                  
                  // 채널 정보
                  channelName: video.snippet?.channelTitle,
                  channelId: video.snippet?.channelId,
                  channelUrl: `https://www.youtube.com/channel/${video.snippet?.channelId}`,
                  
                  // 그룹 정보 (개별 채널 수집이므로 기본값 설정)
                  groupId: null,
                  groupName: '개별 채널 수집',
                  batchId: batchId, // 배치 ID 추가
                  collectionDate: new Date(),
                  collectedFrom: 'individual',
                  
                  // 통계
                  views: parseInt(video.statistics?.viewCount) || 0,
                  likes: parseInt(video.statistics?.likeCount) || 0,
                  commentsCount: parseInt(video.statistics?.commentCount) || 0,
                  
                  // 메타데이터
                  uploadDate: new Date(video.snippet?.publishedAt),
                  duration: durationCategory,
                  durationSeconds: durationSeconds,
                  thumbnailUrl: video.snippet?.thumbnails?.high?.url,
                  description: video.snippet?.description?.substring(0, 1000),
                  
                  // 키워드
                  keywords: keywords || []
                };

                const trendingVideo = new TrendingVideo(trendingVideoData);
                const savedVideo = await trendingVideo.save();
                savedVideos.push(savedVideo);
                savedCount++;
                
                ServerLogger.success(`✅ 영상 저장 완료: ${videoId} - ${video.snippet?.title}`);
              } catch (saveError) {
                ServerLogger.error(`❌ 영상 저장 실패 (${video.id || 'unknown'}):`, saveError.message);
              }
            }
          }
        } catch (channelError) {
          ServerLogger.error(`채널 ${channelId} 수집 실패:`, channelError.message);
        }
      }

      ServerLogger.success(`✅ 다중 채널 수집 완료: ${savedCount}개 영상 저장`);

      const viewStats = this.calculateViewStats(savedVideos);
      
      return {
        totalChannels: channels.length,
        totalVideosFound: savedVideos.length,
        totalVideosSaved: savedCount,
        quotaUsed: totalQuotaUsed,
        videos: savedVideos,
        stats: {
          byPlatform: { 
            YOUTUBE: savedCount,
            INSTAGRAM: 0,
            TIKTOK: 0
          },
          byDuration: this.calculateDurationStats(savedVideos),
          avgViews: viewStats.avgViews,
          totalViews: viewStats.totalViews
        }
      };

    } catch (error) {
      ServerLogger.error('❌ 다중 채널 트렌딩 수집 실패:', error);
      throw error;
    }
  }

  /**
   * 영상 길이별 통계 계산
   */
  calculateDurationStats(videos) {
    const stats = { SHORT: 0, MID: 0, LONG: 0 };
    
    videos.forEach(video => {
      if (video.duration) {
        stats[video.duration] = (stats[video.duration] || 0) + 1;
      } else if (video.durationCategory) {
        stats[video.durationCategory] = (stats[video.durationCategory] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 영상 조회수 통계 계산
   */
  calculateViewStats(videos) {
    if (!videos || videos.length === 0) {
      return { avgViews: 0, totalViews: 0 };
    }

    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
    const avgViews = Math.round(totalViews / videos.length);

    return { avgViews, totalViews };
  }

  /**
   * 딜레이 함수
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GroupTrendingCollector;