/**
 * MongoDB 데이터 직접 조회 스크립트
 * YouTube 핸들명과 채널 URL이 제대로 저장되었는지 확인
 * 
 * 실행 방법:
 * node server/scripts/check-mongodb.js
 */

const mongoose = require('mongoose');
const { ServerLogger } = require('../utils/logger');

// 환경 변수 로드
require('dotenv').config();

async function checkMongoDB() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    ServerLogger.info('🔗 MongoDB Atlas 연결 성공');

    // Video 모델 불러오기
    const Video = require('../models/Video');

    // 전체 비디오 개수 확인
    const totalCount = await Video.countDocuments();
    ServerLogger.info(`📊 전체 비디오 개수: ${totalCount}개`);

    // YouTube 비디오만 조회
    const youtubeVideos = await Video.find({ platform: 'youtube' })
      .sort({ created_at: -1 })
      .limit(10);

    ServerLogger.info(`📺 YouTube 비디오: ${youtubeVideos.length}개 (최신 10개)`);

    if (youtubeVideos.length > 0) {
      ServerLogger.info('\n=== YouTube 비디오 상세 정보 ===');
      
      youtubeVideos.forEach((video, index) => {
        ServerLogger.info(`\n[${index + 1}] ${video.title || '제목 없음'}`);
        ServerLogger.info(`  📅 생성일: ${video.created_at?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  👤 계정: ${video.account || 'N/A'}`);
        ServerLogger.info(`  🏷️ YouTube 핸들명: ${video.youtubeHandle || '❌ 없음'}`);
        ServerLogger.info(`  🔗 채널 URL: ${video.channelUrl || '❌ 없음'}`);
        ServerLogger.info(`  👁️ 조회수: ${video.views?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  👍 좋아요: ${video.likes?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  📂 카테고리: ${video.category || 'N/A'}`);
      });

      // YouTube 핸들명이 있는 비디오 통계
      const withHandleCount = await Video.countDocuments({ 
        platform: 'youtube', 
        youtubeHandle: { $exists: true, $ne: null, $ne: '' }
      });
      
      const withChannelUrlCount = await Video.countDocuments({ 
        platform: 'youtube', 
        channelUrl: { $exists: true, $ne: null, $ne: '' }
      });

      ServerLogger.info(`\n📊 YouTube 핸들명 통계:`);
      ServerLogger.info(`  ✅ 핸들명 있음: ${withHandleCount}개`);
      ServerLogger.info(`  ❌ 핸들명 없음: ${youtubeVideos.length - withHandleCount}개`);
      
      ServerLogger.info(`\n📊 YouTube 채널URL 통계:`);
      ServerLogger.info(`  ✅ 채널URL 있음: ${withChannelUrlCount}개`);
      ServerLogger.info(`  ❌ 채널URL 없음: ${youtubeVideos.length - withChannelUrlCount}개`);

    } else {
      ServerLogger.info('📭 YouTube 비디오가 없습니다.');
    }

    // 플랫폼별 통계
    const platformStats = await Video.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          withHandle: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$youtubeHandle', null] },
                  { $ne: ['$youtubeHandle', ''] }
                ]},
                1,
                0
              ]
            }
          },
          withChannelUrl: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$channelUrl', null] },
                  { $ne: ['$channelUrl', ''] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    ServerLogger.info('\n📈 플랫폼별 통계:');
    platformStats.forEach(stat => {
      ServerLogger.info(`  ${stat._id}: ${stat.count}개 (핸들명: ${stat.withHandle}개, 채널URL: ${stat.withChannelUrl}개)`);
    });

  } catch (error) {
    ServerLogger.error('MongoDB 조회 실패:', error);
  } finally {
    await mongoose.disconnect();
    ServerLogger.info('🔌 MongoDB 연결 종료');
  }
}

// 직접 실행 시
if (require.main === module) {
  checkMongoDB();
}

module.exports = checkMongoDB;