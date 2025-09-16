/**
 * 채널 publishedAt 데이터 마이그레이션 스크립트
 * 기존 채널들의 실제 생성일을 YouTube API에서 가져와서 publishedAt 필드에 저장
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { google } = require('googleapis');
const Channel = require('../models/Channel');
const { ServerLogger } = require('../utils/logger');
const { PLATFORMS } = require('../config/api-messages');

// YouTube API 초기화
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY
});

/**
 * YouTube 채널의 실제 생성일 가져오기
 */
async function getYouTubeChannelPublishedAt(channelId) {
  try {
    const response = await youtube.channels.list({
      part: ['snippet'],
      id: channelId
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('채널을 찾을 수 없습니다');
    }

    const channel = response.data.items[0];
    return channel.snippet.publishedAt;
  } catch (error) {
    ServerLogger.error(`YouTube API 호출 실패 (채널: ${channelId}):`, error.message);
    return null;
  }
}

/**
 * 채널 핸들을 채널 ID로 변환 (최적화된 channels.list 사용)
 * search.list(100 할당량) → channels.list(1 할당량) 99% 절약!
 */
async function resolveChannelId(channelIdentifier) {
  try {
    // 이미 채널 ID 형식인지 확인 (UC로 시작하고 24자)
    if (channelIdentifier.match(/^UC[\w-]{22}$/)) {
      return channelIdentifier;
    }

    // @handle 형태 처리 (channels.list forHandle 사용 - 1 할당량)
    if (channelIdentifier.startsWith('@')) {
      ServerLogger.info(`🔍 @handle 조회 (최적화): ${channelIdentifier}`);
      const response = await youtube.channels.list({
        part: 'id',
        forHandle: channelIdentifier.replace('@', '') // @ 제거
      });

      if (response.data.items && response.data.items.length > 0) {
        ServerLogger.info(`✅ @handle 조회 성공 (1 할당량)`);
        return response.data.items[0].id;
      }
    }

    // username 처리 (channels.list forUsername 사용 - 1 할당량)
    if (!channelIdentifier.includes('/') && !channelIdentifier.includes('@')) {
      ServerLogger.info(`🔍 username 조회 (최적화): ${channelIdentifier}`);
      const response = await youtube.channels.list({
        part: 'id',
        forUsername: channelIdentifier
      });

      if (response.data.items && response.data.items.length > 0) {
        ServerLogger.info(`✅ username 조회 성공 (1 할당량)`);
        return response.data.items[0].id;
      }
    }

    // 위 방법들로 해결되지 않으면 포기 (customUrl은 API 지원 없음)
    ServerLogger.warn(`⚠️ 채널 ID 확정 실패 - 지원되지 않는 형태: ${channelIdentifier}`);
    throw new Error('채널을 찾을 수 없습니다');
  } catch (error) {
    ServerLogger.error(`채널 ID 해결 실패 (${channelIdentifier}):`, error.message);
    return null;
  }
}

/**
 * 메인 마이그레이션 함수
 */
async function migrateChannelPublishedDates() {
  try {
    // MongoDB 연결
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    ServerLogger.info('✅ MongoDB 연결 성공');

    // YouTube API 키 확인
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY 환경변수가 설정되지 않았습니다');
    }

    // publishedAt이 없는 YouTube 채널들 찾기
    const channelsToUpdate = await Channel.find({
      platform: PLATFORMS.YOUTUBE,
      $or: [
        { publishedAt: { $exists: false } },
        { publishedAt: null },
        { publishedAt: '' }
      ]
    });

    ServerLogger.info(`📋 마이그레이션 대상 채널: ${channelsToUpdate.length}개`);

    if (channelsToUpdate.length === 0) {
      ServerLogger.info('🎉 마이그레이션할 채널이 없습니다');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 각 채널에 대해 publishedAt 업데이트
    for (const channel of channelsToUpdate) {
      try {
        ServerLogger.info(`🔍 채널 처리 중: ${channel.name} (${channel.channelId})`);

        // 채널 ID 해결
        let resolvedChannelId = await resolveChannelId(channel.channelId);

        if (!resolvedChannelId) {
          ServerLogger.warn(`⚠️ 채널 ID 해결 실패: ${channel.name}`);
          failCount++;
          continue;
        }

        // YouTube API에서 실제 생성일 가져오기
        const publishedAt = await getYouTubeChannelPublishedAt(resolvedChannelId);

        if (publishedAt) {
          // DB 업데이트
          await Channel.findByIdAndUpdate(channel._id, {
            publishedAt: publishedAt,
            // 올바른 채널 ID도 함께 업데이트
            channelId: resolvedChannelId
          });

          ServerLogger.info(`✅ 업데이트 완료: ${channel.name} - ${publishedAt}`);
          successCount++;
        } else {
          ServerLogger.warn(`⚠️ publishedAt 가져오기 실패: ${channel.name}`);
          failCount++;
        }

        // API 할당량 보호를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        ServerLogger.error(`❌ 채널 처리 실패 (${channel.name}):`, error.message);
        failCount++;
      }
    }

    // 결과 리포트
    ServerLogger.info('\n📊 마이그레이션 결과:');
    ServerLogger.info(`✅ 성공: ${successCount}개`);
    ServerLogger.info(`❌ 실패: ${failCount}개`);
    ServerLogger.info(`📋 총 처리: ${channelsToUpdate.length}개`);

  } catch (error) {
    ServerLogger.error('💥 마이그레이션 실행 실패:', error);
    throw error;
  } finally {
    // MongoDB 연결 종료
    await mongoose.disconnect();
    ServerLogger.info('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateChannelPublishedDates()
    .then(() => {
      ServerLogger.info('🎉 마이그레이션 완료');
      process.exit(0);
    })
    .catch((error) => {
      ServerLogger.error('💥 마이그레이션 실패:', error);
      process.exit(1);
    });
}

module.exports = { migrateChannelPublishedDates };