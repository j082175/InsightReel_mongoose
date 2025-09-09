/**
 * Instagram MongoDB 데이터 조회 스크립트
 * Instagram 비디오의 channelName, channelUrl 필드가 제대로 저장되었는지 확인
 * 
 * 실행 방법:
 * node server/scripts/check-instagram-data.js
 */

const mongoose = require('mongoose');
const { ServerLogger } = require('../utils/logger');
const { FieldMapper } = require('../types/field-mapper');

// 환경 변수 로드
require('dotenv').config();

async function checkInstagramData() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    ServerLogger.info('🔗 MongoDB Atlas 연결 성공');

    // Video 모델 불러오기
    const Video = require('../models/Video');

    // 전체 비디오 개수 확인
    const totalCount = await Video.countDocuments();
    ServerLogger.info(`📊 전체 비디오 개수: ${totalCount}개`);

    // Instagram 비디오만 조회 (최신 5개)
    const instagramVideos = await Video.find({ 
      [FieldMapper.get('PLATFORM')]: 'INSTAGRAM' 
    })
      .sort({ [FieldMapper.get('CREATED_AT')]: -1 })
      .limit(5);

    ServerLogger.info(`📸 Instagram 비디오: ${instagramVideos.length}개 (최신 5개)`);

    if (instagramVideos.length > 0) {
      ServerLogger.info('\n=== Instagram 비디오 상세 정보 ===');
      
      instagramVideos.forEach((video, index) => {
        ServerLogger.info(`\n[${index + 1}] ${video[FieldMapper.get('TITLE')] || '제목 없음'}`);
        ServerLogger.info(`  📅 생성일: ${video[FieldMapper.get('CREATED_AT')]?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  👤 채널이름: "${video[FieldMapper.get('CHANNEL_NAME')] || ''}"`);
        ServerLogger.info(`  🔗 채널 URL: "${video[FieldMapper.get('CHANNEL_URL')] || ''}"`);
        ServerLogger.info(`  📝 설명: "${(video[FieldMapper.get('DESCRIPTION')] || '').substring(0, 100)}${(video[FieldMapper.get('DESCRIPTION')] || '').length > 100 ? '...' : ''}"`);
        ServerLogger.info(`  👁️ 조회수: ${video[FieldMapper.get('VIEWS')]?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  👍 좋아요: ${video[FieldMapper.get('LIKES')]?.toLocaleString() || 'N/A'}`);
        ServerLogger.info(`  📂 카테고리: ${video[FieldMapper.get('CATEGORY')] || 'N/A'}`);
        ServerLogger.info(`  🔗 원본 URL: ${video[FieldMapper.get('URL')] || 'N/A'}`);
        
        // 필드 상태 확인
        const hasChannelName = video[FieldMapper.get('CHANNEL_NAME')] && video[FieldMapper.get('CHANNEL_NAME')].trim() !== '';
        const hasChannelUrl = video[FieldMapper.get('CHANNEL_URL')] && video[FieldMapper.get('CHANNEL_URL')].trim() !== '';
        const hasDescription = video[FieldMapper.get('DESCRIPTION')] && video[FieldMapper.get('DESCRIPTION')].trim() !== '';
        
        ServerLogger.info(`  ✅ 상태: 채널명(${hasChannelName ? '✓' : '✗'}) 채널URL(${hasChannelUrl ? '✓' : '✗'}) 설명(${hasDescription ? '✓' : '✗'})`);
      });

      // Instagram 채널 정보 통계
      const withChannelNameCount = await Video.countDocuments({ 
        [FieldMapper.get('PLATFORM')]: 'INSTAGRAM', 
        [FieldMapper.get('CHANNEL_NAME')]: { $exists: true, $ne: null, $ne: '' }
      });
      
      const withChannelUrlCount = await Video.countDocuments({ 
        [FieldMapper.get('PLATFORM')]: 'INSTAGRAM', 
        [FieldMapper.get('CHANNEL_URL')]: { $exists: true, $ne: null, $ne: '' }
      });

      const withDescriptionCount = await Video.countDocuments({ 
        [FieldMapper.get('PLATFORM')]: 'INSTAGRAM', 
        [FieldMapper.get('DESCRIPTION')]: { $exists: true, $ne: null, $ne: '' }
      });

      const totalInstagramCount = await Video.countDocuments({ 
        [FieldMapper.get('PLATFORM')]: 'INSTAGRAM'
      });

      ServerLogger.info(`\n📊 Instagram 데이터 완성도 통계:`);
      ServerLogger.info(`  📱 총 Instagram 비디오: ${totalInstagramCount}개`);
      ServerLogger.info(`  👤 채널명 있음: ${withChannelNameCount}개 (${Math.round(withChannelNameCount/totalInstagramCount*100)}%)`);
      ServerLogger.info(`  🔗 채널URL 있음: ${withChannelUrlCount}개 (${Math.round(withChannelUrlCount/totalInstagramCount*100)}%)`);
      ServerLogger.info(`  📝 설명 있음: ${withDescriptionCount}개 (${Math.round(withDescriptionCount/totalInstagramCount*100)}%)`);

    } else {
      ServerLogger.info('📭 Instagram 비디오가 없습니다.');
    }

    // 플랫폼별 통계
    const platformStats = await Video.aggregate([
      {
        $group: {
          _id: `$${FieldMapper.get('PLATFORM')}`,
          count: { $sum: 1 },
          withChannelName: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: [`$${FieldMapper.get('CHANNEL_NAME')}`, null] },
                  { $ne: [`$${FieldMapper.get('CHANNEL_NAME')}`, ''] }
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
                  { $ne: [`$${FieldMapper.get('CHANNEL_URL')}`, null] },
                  { $ne: [`$${FieldMapper.get('CHANNEL_URL')}`, ''] }
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
      const channelNamePerc = Math.round(stat.withChannelName/stat.count*100);
      const channelUrlPerc = Math.round(stat.withChannelUrl/stat.count*100);
      ServerLogger.info(`  ${stat._id}: ${stat.count}개 (채널명: ${stat.withChannelName}개/${channelNamePerc}%, 채널URL: ${stat.withChannelUrl}개/${channelUrlPerc}%)`);
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
  checkInstagramData();
}

module.exports = checkInstagramData;